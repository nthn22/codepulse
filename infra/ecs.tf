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
      Resource = [aws_secretsmanager_secret.jwt_secret.arn, aws_secretsmanager_secret.db_secret.arn,
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
      { name = "DATABASE_URL", valueFrom = aws_secretsmanager_secret.db_secret.arn },
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
    subnets          = [for k, v in local.subnets : aws_subnet.this[k].id if v.tier == "app"]
    security_groups  = [aws_security_group.task_sg.id]
    assign_public_ip = !var.use_nat_gateway #assign public ip if we don't use NAT
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.alb_target_group.arn
    container_name   = local.container_name
    container_port   = 3001
  }
  # make sure the alb listener is ready before starting the service
  depends_on = [aws_lb_listener.alb_listener]

}