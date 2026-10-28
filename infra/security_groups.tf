# Creating the security groups for the ALB, task and RDS. The security groups are created in the main VPC. The security groups are created with the following rules:
# ALB security group: Inbound rule: Allow traffic from port 80. Outbound rule: Allow traffic from port 3001 to port 3001.
# Task security group: Inbound rule: Allow traffic from port 3001 from the ALB security group. Outbound rule: Allow all traffic to all ports.
# RDS security group: Inbound rule: Allow traffic from port 5432 from the task security group. No outbound rule is created for the RDS security group.


#create security group for the ALB

resource "aws_security_group" "alb_sg" {
  name   = "${var.project_name}-alb-sg"
  vpc_id = aws_vpc.main_vpc.id
}

#create security group for the task

resource "aws_security_group" "task_sg" {
  name   = "${var.project_name}-task-sg"
  vpc_id = aws_vpc.main_vpc.id
}

#create security group for RDS

resource "aws_security_group" "rds_sg" {
  name   = "${var.project_name}-rds-sg"
  vpc_id = aws_vpc.main_vpc.id
}

# create ingress rule for ALB security group 
resource "aws_vpc_security_group_ingress_rule" "alb_inbound" {
  security_group_id = aws_security_group.alb_sg.id
  from_port         = 80
  to_port           = 80
  ip_protocol       = "tcp"
  cidr_ipv4         = "0.0.0.0/0"
}

# create egress rule for ALB security group
resource "aws_vpc_security_group_egress_rule" "alb_outbound" {
  security_group_id            = aws_security_group.alb_sg.id # which sg this rule belongs to
  from_port                    = 3001
  to_port                      = 3001
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.task_sg.id # destination: traffic can only go to the task SG
}

# create ingress rule for task SG
resource "aws_vpc_security_group_ingress_rule" "task_inbound" {
  security_group_id            = aws_security_group.task_sg.id # task SG
  from_port                    = 3001
  to_port                      = 3001
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.alb_sg.id # alb SG (only from alb)
}

# create egress rule for task SG
resource "aws_vpc_security_group_egress_rule" "task_outbound" {
  security_group_id = aws_security_group.task_sg.id
  ip_protocol       = "-1" # = allow protocols no ports needed
  cidr_ipv4         = "0.0.0.0/0"
}

# create ingress rule for RDS SG
resource "aws_vpc_security_group_ingress_rule" "rds_inbound" {
  security_group_id            = aws_security_group.rds_sg.id # rds SG
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.task_sg.id # task SG (only from task)
}

#no egress rule for RDS SG as we do not want to allow any outbound traffic from the RDS SG

