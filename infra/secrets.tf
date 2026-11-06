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
