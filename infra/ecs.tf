# ecs config

# create cloudwatch logs 
resource "aws_cloudwatch_log_group" "ecs" {
    name = "/ecs/${var.project_name}" # named for easier filtering
    retention_in_days = 30
}

# create cluster
resource "aws_ecs_cluster" "main" {
    name = "${var.project_name}-ecs-cluster"
}

# iam - who can assume the role
data "aws_iam_policy_statement" "ecs_assume"{
    statement{
        actions = ["sts:AssumeRole"]
        principals {
            type = "Service"
            identifiers = [] #modify for later
        }
    }
}

# aws iam role - task execution
resource "aws_iam_role" "task_execution" {
    name = "${var.project_name}-task-exec"
    assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy_attachment" "task_execution" {
    role = "aws_iam_role_task_execution.id" #attach to task execution role
    policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# read secrets policy
resource "aws_iam_role_policy" "read_secrets" {
    name = "${var.project_name}-read-secrets"
    role = x
    policy = jsonencode({
        Version = "2012-10-17"
        Statement = [{
            Effect = x
            Action = []
            Resource = [] 
        }]
    })
}

# task definition
resource "aws_ecs_task_definition" "app" {
    family = x
    requires_compatibilities = []
    network_mode = x
    cpu = x
    memory = x
    execution_role_arn = "aws_iam_role_task_exection.arn"

    container_definitions = jsonencode([{
        name = "${var.project_name}-app-td"
        image = "${aws_ecr_repository.codepulse.repository_url}:${var.image_tag}"
        essential = true

        portMappings = [{containerPort = 80, protocol = "tcp"}]

        environment = [{ name = "NODE_ENV", value = x}]

        secrets = [
            {name = "JWT_SECRET", valueFrom = "aws_secretsmanager_secret_jwt_secret.arn"},
            {name = "DATABASE_URL", valueFrom = "aws_secretsmanager_secret_db_secret.arn"},

        ]

        logConfiguration = {
            logDriver = "awslogs"
            options = {
                "awslogs-group" = x
                "awslogs-region" = "us-east-2"
                "awslogs-stream-prefix" = "ecs"
            }
        }
    }])
}

# service

resource "aws_ecs_service" "app" {
    name = x
    cluster = x
    task_definition = x
    desired_count = 1
    launch_type = x

    network_configuration {
        #get the subnets of app
        subnets = [for k,v in local.subnets : aws_subnet.this[k].id if v.tier == "app"] 
        security_groups = ["aws_security_group_task_sg.id"] 
        assign_public_ip = var.use_nat_gateway == false
    }

    load_balancer {
        target_group_arn = "aws_lb_target_group_alb_target_group.arn"
        container_name = x
        container_port = 80
    }

    depends_on = [aws_lb_listener.alb_listener]

}