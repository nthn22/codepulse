#secrets for the project

# db random password
resource "random_password" "rds_password" {
  length           = 16
  special          = true
  override_special = "-_"
}

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

# db secrets manager
resource "aws_secretsmanager_secret" "db_secret" {
  name                    = "${var.project_name}-db-secret"
  recovery_window_in_days = 0
}

# create a secret version for the db secret
resource "aws_secretsmanager_secret_version" "db_secret_version" {
  secret_id     = aws_secretsmanager_secret.db_secret.id
  secret_string = "postgresql://${aws_db_instance.rds_instance.username}:${random_password.rds_password.result}@${aws_db_instance.rds_instance.address}:5432/${aws_db_instance.rds_instance.db_name}"
  # postgresql is the protocol prisma expects
  # ${aws_db_instance.rds_instance.username} is the username
  # ${random_password.rds_password.result} is the password
  # ${aws_db_instance.rds_instance.address} is the RDS hostname (address, not endpoint)
  # 5432 is the default port for postgres
  # ${aws_db_instance.rds_instance.db_name} is the database name
}

# create secret manager for claude key
resource "aws_secretsmanager_secret" "claude_secret" {
  name                    = "${var.project_name}-claude-secret"
  recovery_window_in_days = 0
}
