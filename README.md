# CodePulse: AI Code Review on AWS ECS Fargate

CodePulse lets you paste code, upload a file, or import from GitHub and get instant AI feedback powered by Claude. Reviews stream in real time, and logged-in users get their review history saved to a database.

The app is containerized with Docker and deployed to **AWS ECS Fargate**, with all infrastructure defined in **Terraform** and deployed through **GitHub Actions** using OIDC (no stored AWS keys).

---

## Architecture

![CodePulse AWS architecture](docs/architecture.svg)

**Request path:** Users → Internet Gateway → AWS WAF → Application Load Balancer (public subnets) → ECS Fargate tasks (app subnets) → RDS PostgreSQL (private DB subnets)

| Tier | Subnets | Internet access | What runs there |
|---|---|---|---|
| Public | 10.0.1.0/24, 10.0.2.0/24 | Route to the Internet Gateway | ALB, NAT Gateway (optional) |
| App | 10.0.11.0/24, 10.0.12.0/24 | Outbound via IGW or NAT (toggle) | ECS Fargate tasks |
| DB | 10.0.21.0/24, 10.0.22.0/24 | None, VPC-local route only | RDS PostgreSQL |

Every tier spans two Availability Zones. The ALB and the RDS subnet group both require subnets in at least two AZs.

---

## Security Layers (Defense in Depth)

No single control is enough on its own, so each layer covers what the others miss.

| Layer | Control | Protects against |
|---|---|---|
| Edge | AWS WAF on the ALB: AWS managed rule groups (Common, Known Bad Inputs, SQLi) + per-IP rate limit | Known web attacks, request floods, API cost abuse |
| Network | Security group chain: ALB SG → Task SG (3001) → RDS SG (5432) | Direct access to tasks or the database |
| Routing | DB subnets have no internet route; RDS `publicly_accessible = false` | Any network path to the database |
| Application | Prisma parameterized queries, JWT auth, per-user ownership checks | SQL injection, users reading others' data |
| Data | Least-privilege database user for the app | Limits damage if something gets through |
| Secrets | Secrets Manager for app secrets; GitHub OIDC, no stored AWS keys | Leaked keys in code, images, or CI |
| Supply chain | ECR scan on push, immutable image tags | Shipping known-vulnerable or overwritten images |
| Detection | CloudWatch alarms on ALB 5xx and WAF blocks; Claude API spend limit | Not noticing an attack or runaway cost |

---

## Cost Decisions

This is a portfolio project, so it is built to cost close to nothing when it is not being demoed.

- **Destroy between demos.** The whole stack is rebuilt from code in about 10 minutes with one workflow run, and torn down with another. State lives in S3, the code lives in Git.
- **NAT Gateway is optional** (`use_nat_gateway`, default `false`). A NAT costs about $32/month even with no traffic.
  - **Cost mode (default):** tasks run in the app subnets with a public IP and reach ECR, CloudWatch, and the Claude API through the Internet Gateway. Inbound is still locked down: the Task SG only accepts traffic from the ALB SG.
  - **Production mode (`true`):** app subnets become private and outbound traffic goes through a NAT Gateway. This uses one NAT to save cost; production would run one per AZ.
- **Smallest sizes:** Fargate 0.25 vCPU / 512 MB, RDS `db.t4g.micro`, single-AZ, no automated backups.
- **Short log retention** (7 days) and an ECR lifecycle policy that keeps only the last 5 images.

---

## Infrastructure (Terraform)

All infrastructure lives in [`infra/`](infra), one file per concern:

| File | What it creates |
|---|---|
| `providers.tf` | AWS and random providers, S3 remote backend with native state locking |
| `variables.tf` | Region, project name, VPC CIDR, NAT toggle, image tag, desired count, alert email |
| `network.tf` | VPC, 6 subnets across 2 AZs, Internet Gateway, optional NAT + EIP, route tables and associations |
| `security_groups.tf` | ALB, task, and RDS security groups with separate rule resources |
| `ecr.tf` | Container registry (immutable tags, scan on push) and lifecycle policy |
| `rds.tf` | PostgreSQL 16 on RDS in the private DB subnets |
| `secrets.tf` | Generated DB password and JWT secret, Secrets Manager secrets for the DB URL, JWT, and Claude API key |
| `alb.tf` | Internet-facing ALB, IP target group with `/api/health` health checks, HTTP listener |
| `waf.tf` | WAF web ACL with managed rule groups and a rate limit, attached to the ALB |
| `ecs.tf` | ECS cluster, task execution role, task definition (secrets injected from Secrets Manager), Fargate service |
| `monitoring.tf` | SNS email alerts and CloudWatch alarms for 5xx errors and WAF blocks |
| `outputs.tf` | ALB URL, ECR repository URL, cluster and service names, log group |

**Design notes**
- Subnets are built from one `locals` map with `for_each`, and each subnet has a `tier` field that the route table associations, DB subnet group, ALB, and ECS service all filter on.
- The NAT toggle uses two `aws_route` resources with opposite `count` conditions, so exactly one default route exists at a time.
- Security group rules are separate resources instead of inline blocks, which avoids a circular reference between the ALB and task groups.
- Secret values never appear in `.tf` files. The DB password and JWT secret are generated by Terraform; the Claude API key is set by the deploy workflow from a GitHub secret.

---

## CI/CD (GitHub Actions)

| Workflow | Trigger | What it does |
|---|---|---|
| [`deploy.yml`](.github/workflows/deploy.yml) | Every push to `main` | Runs server tests, verifies the Docker image builds |
| [`deploy.yml`](.github/workflows/deploy.yml) | "Run workflow" button | Creates infra, sets the Claude key, builds and pushes the image to ECR (tagged with the commit SHA), starts the service, waits for it to be healthy, prints the URL |
| [`destroy.yml`](.github/workflows/destroy.yml) | "Run workflow" button (type `destroy` to confirm) | Tears down the whole stack |

Both deploy and destroy authenticate to AWS through **OIDC**: GitHub exchanges a short-lived token for temporary AWS credentials, so no access keys are stored anywhere. Deploy and destroy share a concurrency group so they can never run at the same time.

**Required repository settings** (Settings → Secrets and variables → Actions):

| Type | Name | Purpose |
|---|---|---|
| Variable | `AWS_ROLE_ARN` | IAM role GitHub assumes through OIDC |
| Variable | `ALERT_EMAIL` | Where CloudWatch alarms are sent |
| Secret | `ANTHROPIC_API_KEY` | Written into Secrets Manager on deploy |

---

## Deploying Manually

```bash
cd infra
terraform init

# 1. Create everything with no running tasks
terraform apply -var="image_tag=$(git rev-parse --short HEAD)" -var="desired_count=0"

# 2. Push the image
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
IMAGE=$(terraform output -raw repository_url)
docker build -t $IMAGE:$(git rev-parse --short HEAD) ..
docker push $IMAGE:$(git rev-parse --short HEAD)

# 3. Set the Claude API key
aws secretsmanager put-secret-value --secret-id codepulse-claude-secret --secret-string "sk-ant-..."

# 4. Start the service
terraform apply -var="image_tag=$(git rev-parse --short HEAD)" -var="desired_count=1"

# 5. Tear it down when finished
terraform destroy -var="image_tag=destroy"
```

`alert_email` is read from a gitignored `terraform.tfvars` file.

---

## What Broke and How I Fixed It

- **Docker build failed with `vite: not found`.** The real error was hidden higher in the log: `npm error Exit handler never called!`. npm was crashing after 72 seconds because my work network's SSL inspection broke its connection to the registry, so nothing was installed but the step still exited successfully. Building outside that network fixed it.
- **WAF would have blocked the app's main feature.** The AWS Common Rule Set includes `SizeRestrictions_BODY`, which blocks request bodies over 8 KB, and CodePulse's whole purpose is sending code to review. I overrode that one rule to `count` (log only) instead of disabling the whole group.
- **A copy-paste bug would have made the database subnets public.** Both new route table associations still pointed at the public route table. `terraform validate` and `plan` would both pass, so I caught it by reading what each association actually referenced. Lesson: read the plan, not just the exit code.
- **Immutable ECR tags mean `:latest` only works once.** Every image is tagged with the git commit SHA instead, which also makes it obvious which commit is running.
- **Secrets Manager keeps deleted secrets for 7 to 30 days by default,** which would make the next deploy fail on a name conflict. Setting `recovery_window_in_days = 0` makes the destroy and redeploy cycle work.

---

## Features

- **AI code review:** Claude analyzes your code for bugs, security issues, performance, and best practices
- **Real-time streaming:** the review appears word by word as Claude generates it
- **File upload:** drag and drop or select a file; language is auto-detected from the extension
- **GitHub import:** paste a public GitHub file URL and the code loads directly into the editor
- **Authentication:** register and log in with email and password, sessions handled with JWT
- **Review history:** every review is saved for logged-in users and browsable from the History page

---

## Tech Stack

### Frontend
| Tool | Purpose |
|---|---|
| React 19 | UI component library |
| React Router | Client-side routing |
| Vite | Development server and build tool |
| Tailwind CSS | Utility-first styling |
| Monaco Editor | The editor that powers VS Code |
| React Markdown | Renders the AI review as formatted markdown |

### Backend
| Tool | Purpose |
|---|---|
| Node.js + Express | HTTP server and API routes |
| Anthropic SDK | Calls the Claude API and streams the response |
| Prisma | Database ORM and migrations |
| PostgreSQL | Users and review history |
| JSON Web Tokens | Stateless authentication |
| bcryptjs | Password hashing |

### Infrastructure and DevOps
| Tool | Purpose |
|---|---|
| Docker | Multi-stage build: React build, server deps + Prisma client, slim runtime image |
| Terraform | All AWS infrastructure as code, S3 remote state with locking |
| AWS | VPC, ALB, WAF, ECS Fargate, ECR, RDS, Secrets Manager, CloudWatch, SNS |
| GitHub Actions | Test and build on push, OIDC-authenticated deploy and destroy |

---

## Application Architecture

```
Browser (React)
    │
    │  HTTP / SSE (Server-Sent Events)
    ▼
Express Server (Node.js)
    │
    ├── /api/health   → health check used by the ALB
    ├── /api/auth     → register, login, get current user
    ├── /api/reviews  → stream a review (Claude), save to DB, fetch history
    └── /api/github   → proxy fetch a file from GitHub
    │
    ├── Anthropic API (Claude): streams the AI response
    └── PostgreSQL (Prisma): stores users and reviews
```

In production, Express also serves the built React app, so the whole application ships as **one container image** behind one port (3001).

**Server-Sent Events:** instead of waiting for Claude to finish, the server keeps the HTTP connection open and sends chunks of text as Claude produces them, so the review appears to type itself out.

**JWT authentication:** on login the server returns a signed token with the user's ID. The browser sends it in the `Authorization: Bearer <token>` header, and the server verifies the signature, so no session storage is needed.

---

## Project Structure

```
codepulse/
├── .github/workflows/       # deploy.yml and destroy.yml
├── docs/                    # Architecture diagram
├── infra/                   # Terraform (see table above)
├── Dockerfile               # Multi-stage build for the single app image
├── client/                  # React frontend (Vite)
│   └── src/
│       ├── __tests__/       # Vitest component and hook tests
│       ├── components/      # Shared UI components
│       ├── context/         # Global auth state
│       ├── hooks/           # Custom hooks (useStream)
│       ├── pages/           # One file per route
│       ├── services/        # Backend API calls
│       └── utils/           # Helpers (detectLanguage)
└── server/                  # Express backend
    ├── prisma/              # Schema and migrations
    └── src/
        ├── __tests__/       # Jest route and middleware tests
        ├── lib/             # Prisma client
        ├── middleware/      # JWT auth check
        ├── routes/          # One file per API resource
        ├── services/        # Claude API calls
        └── utils/           # GitHub URL helpers
```

---

## Local Setup

### Prerequisites
- Node.js 20+
- A PostgreSQL database (local, Docker, or a free hosted tier)
- An Anthropic API key

### 1. Install dependencies
```bash
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment variables
Create `server/.env` from `server/.env.example`:
```env
PORT=3001
CLIENT_URL=http://localhost:5173
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://user:password@host/dbname
JWT_SECRET=any_long_random_string
```

### 3. Run the database migration
```bash
cd server
npm run db:migrate
```

### 4. Start the servers
```bash
# Terminal 1: backend
cd server && npm run dev

# Terminal 2: frontend
cd client && npm run dev
```
Open **http://localhost:5173**

---

## Running Tests

```bash
cd server && npm test   # Jest: routes and middleware (Prisma mocked)
cd client && npm test   # Vitest: components and hooks
```
