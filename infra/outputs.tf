# Outputs for the infrastructure resources

# output ecr repository url
output "repository_url" {
  value = aws_ecr_repository.codepulse.repository_url
}