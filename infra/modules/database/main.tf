# rds config file

# db random password
resource "random_password" "rds_password" {
  length           = 16
  special          = true
  override_special = "-_"
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
# rds subnet group
resource "aws_db_subnet_group" "rds_subnet_group" {
  name       = "${var.project_name}-rds-subnet-group"
  subnet_ids = var.db_subnet_ids # get all private subnets for the rds subnet group
  tags = {
    Name = "${var.project_name}-rds-subnet-group"
  }
}

resource "aws_db_instance" "rds_instance" {
  identifier        = "${var.project_name}-rds-instance"
  allocated_storage = 20 # 20 GB of storage

  engine                  = "postgres"     # PostgreSQL engine
  engine_version          = "16"           # specify the engine version, you can change this to any other supported version
  instance_class          = "db.t4g.micro" # smallest and cheapest
  db_name                 = "codepulse_db"
  username                = "codepulse"
  password                = random_password.rds_password.result # use the random password generated in secrets.tf
  db_subnet_group_name    = aws_db_subnet_group.rds_subnet_group.name
  vpc_security_group_ids  = [var.rds_sg_id]
  deletion_protection     = false # set to true in production to prevent accidental deletion, false so destroy is easier
  skip_final_snapshot     = true  # set to false in production to take a final snapshot before deletion
  publicly_accessible     = false # rds should not be publicly accessible, only accessible from the vpc
  multi_az                = false # set to true in production for high availability, for now false to minimize cost
  storage_encrypted       = true  # encrypt the storage for security
  backup_retention_period = 0     # number of days to retain backups, set to 0 to disable backups
}

 