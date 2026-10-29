# rds config file

# rds subnet group
resource "aws_db_subnet_group" "rds_subnet_group" {
  name       = "${var.project_name}-rds-subnet-group"
  subnet_ids = [for k, v in local.subnets : aws_subnet.this[k].id if v.tier == "private"] # get all private subnets for the rds subnet group
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
  vpc_security_group_ids  = [aws_security_group.rds_sg.id]
  deletion_protection     = false # set to true in production to prevent accidental deletion, false so destroy is easier
  skip_final_snapshot     = true  # set to false in production to take a final snapshot before deletion
  publicly_accessible     = false # rds should not be publicly accessible, only accessible from the vpc
  multi_az                = false # set to true in production for high availability, for now false to minimize cost
  storage_encrypted       = true  # encrypt the storage for security
  backup_retention_period = 0     # number of days to retain backups, set to 0 to disable backups
}

 