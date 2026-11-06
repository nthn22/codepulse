# create db secret arn output

output "db_secret_arn" {
  value = aws_secretsmanager_secret.db_secret.arn
}