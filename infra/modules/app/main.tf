# ecr repository for the CodePulse image
# tag immutable to prevent overwriting existing images
# *note - means can't push same tag twice, tag each image with something unique


#create ecr repo for codepulse image
resource "aws_ecr_repository" "codepulse" {
  name                 = "${var.project_name}-repo"
  image_tag_mutability = "IMMUTABLE" #prevent overwriting existing images
  image_scanning_configuration {
    scan_on_push = true #supply-chain rule in security table
  }
  force_delete = true # allows deletion of the repo even if it has images in it
}

# ecr lifecycle policy to keep only the last 5 images in the repo. This is to prevent the repo from getting too large and to keep the cost down. 
# The policy is applied to the repository after it is created.
resource "aws_ecr_lifecycle_policy" "codepulse" {
  repository = aws_ecr_repository.codepulse.name

  # jsonencode instead of policy for readability and easier debugging 
  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "keep last 5 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 5
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}


# ecs config

# create cloudwatch logs 
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.project_name}" # named for easier filtering
  retention_in_days = 7
}

# create cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-ecs-cluster"
}

# iam - who can assume the role
data "aws_iam_policy_document" "ecs_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"] #service that runs fargate
    }
  }
}

# aws iam role - task execution
resource "aws_iam_role" "task_execution" {
  name               = "${var.project_name}-task-exec"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

#attachment policy for task exe
resource "aws_iam_role_policy_attachment" "task_execution" {
  role       = aws_iam_role.task_execution.name #attach to task execution role
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# read secrets policy
resource "aws_iam_role_policy" "read_secrets" {
  name = "${var.project_name}-read-secrets"
  role = aws_iam_role.task_execution.name # allowed to execute
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["secretsmanager:GetSecretValue"] # get secret
      Resource = [aws_secretsmanager_secret.jwt_secret.arn, var.db_secret_arn,
      aws_secretsmanager_secret.claude_secret.arn] # secret arns
    }]
  })
}

#local task definition name
locals {
  container_name = "${var.project_name}-app-td"
}

# task definition
resource "aws_ecs_task_definition" "app" {
  family                   = "${var.project_name}-app-task"
  requires_compatibilities = ["FARGATE"] # run on fargate
  network_mode             = "awsvpc"    # required for fargate
  cpu                      = "256"       #min
  memory                   = "512"       #min
  execution_role_arn       = aws_iam_role.task_execution.arn

  container_definitions = jsonencode([{
    name = local.container_name
    # unique image tag per image since we made it immutable
    image     = "${aws_ecr_repository.codepulse.repository_url}:${var.image_tag}"
    essential = true

    portMappings = [{ containerPort = 3001, protocol = "tcp" }]

    environment = [{ name = "NODE_ENV", value = "production" }]

    # give the task definition the secrets
    secrets = [
      { name = "JWT_SECRET", valueFrom = aws_secretsmanager_secret.jwt_secret.arn },
      { name = "DATABASE_URL", valueFrom = var.db_secret_arn },
      { name = "ANTHROPIC_API_KEY", valueFrom = aws_secretsmanager_secret.claude_secret.arn }

    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.ecs.name
        "awslogs-region"        = var.region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])
}

# service

resource "aws_ecs_service" "app" {
  name            = "${var.project_name}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    #get the subnets of app
    subnets          = var.app_subnet_ids # get output of app subnet ids
    security_groups  = [var.task_sg_id] # task security group
    assign_public_ip = !var.use_nat_gateway #assign public ip if we don't use NAT
  }

  load_balancer {
    target_group_arn = var.target_group_arn
    container_name   = local.container_name
    container_port   = 3001
  }

}

#secrets for the project

#jwt random password
resource "random_password" "jwt_secret" {
  length  = 32
  special = true
}

# jwt secrets manager
resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${var.project_name}-jwt-secret"
  recovery_window_in_days = 0
}

# create a secret version for the jwt secret
resource "aws_secretsmanager_secret_version" "jwt_secret_version" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

# create secret manager for claude key
resource "aws_secretsmanager_secret" "claude_secret" {
  name                    = "${var.project_name}-claude-secret"
  recovery_window_in_days = 0
}









