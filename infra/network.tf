# This file contains the network resources for the CodePulse project.

# Basic summary - we create the main vpc, split that vpc into 6 subnets
# for high availability across 2 AZs. divide these into tiers. create
# gateways as the exit. route tables determine which exit the data takes
# the associations connect each tier to its route table

# define the VPC
resource "aws_vpc" "main_vpc" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

#local map with for_each to create the required subnets
#without having to define each subnet individually
#two subnets per tier to allow for high availability across two AZs
locals {
  azs = ["us-east-1a", "us-east-1b"]

  subnets = {
    public_a     = { cidr = "10.0.1.0/24", az = local.azs[0], tier = "public" }
    public_b     = { cidr = "10.0.2.0/24", az = local.azs[1], tier = "public" }
    app_a        = { cidr = "10.0.11.0/24", az = local.azs[0], tier = "app" }
    app_b        = { cidr = "10.0.12.0/24", az = local.azs[1], tier = "app" }
    private_db_a = { cidr = "10.0.21.0/24", az = local.azs[0], tier = "private" }
    private_db_b = { cidr = "10.0.22.0/24", az = local.azs[1], tier = "private" }
  }
}

# create the subnets using the local map
resource "aws_subnet" "this" {
  for_each = local.subnets

  vpc_id            = aws_vpc.main_vpc.id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az

  tags = {
    Name = "${var.project_name}-${each.key}"
  }
}

# create the Internet Gateway 
resource "aws_internet_gateway" "main_gw" {
  vpc_id = aws_vpc.main_vpc.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

# create the EIP for the NAT Gateway if use_nat_gateway is true
# this is b/c a NAT needs an EIP for outbound traffic
resource "aws_eip" "nat" {
  count  = var.use_nat_gateway ? 1 : 0 #remember for allocation to use list
  domain = "vpc"

  tags = {
    Name = "${var.project_name}-nat-eip"
  }
}

# create the NAT Gateway if use_nat_gateway is true
resource "aws_nat_gateway" "main_nat" {
  count = var.use_nat_gateway ? 1 : 0

  allocation_id = aws_eip.nat[0].id #remember to use as list b/c count converts to list
  subnet_id     = aws_subnet.this["public_a"].id

  depends_on = [aws_internet_gateway.main_gw] #nat can't work without IGW

  tags = {
    Name = "${var.project_name}-nat"
  }
}

# create the public route table
resource "aws_route_table" "public_rt" {
  vpc_id = aws_vpc.main_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main_gw.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

# create the app route table 
resource "aws_route_table" "app_rt" {
  vpc_id = aws_vpc.main_vpc.id

  # no route block since aws_route resources attach routes to the table
  tags = {
    Name = "${var.project_name}-app-rt"
  }
}

# we create two separate route blocks for the app RT
# flip between depending if app use a NAT or not

# create route to nat if app uses it
resource "aws_route" "app_via_nat" {
  count = var.use_nat_gateway ? 1 : 0 #exists only when toggle is on

  route_table_id         = aws_route_table.app_rt.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.main_nat[0].id
}

# create route to igw if app doesn't use nat
resource "aws_route" "app_via_igw" {
  count = var.use_nat_gateway ? 0 : 1 #exists only when toggle is off

  route_table_id         = aws_route_table.app_rt.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.main_gw.id
}

# no internet route; only automatic VPC-local route
resource "aws_route_table" "db_rt" {
  vpc_id = aws_vpc.main_vpc.id
  tags = {
    Name = "${var.project_name}-db-rt"
  }
}

# create the public route table association
resource "aws_route_table_association" "public_rt_assoc" {
  for_each = { for k, v in local.subnets : k => v if v.tier == "public" }

  subnet_id      = aws_subnet.this[each.key].id
  route_table_id = aws_route_table.public_rt.id
}

# app route table association 
resource "aws_route_table_association" "app_rt_assoc" {
  for_each = { for k, v in local.subnets : k => v if v.tier == "app" }

  subnet_id      = aws_subnet.this[each.key].id
  route_table_id = aws_route_table.app_rt.id
}

# private route table association
resource "aws_route_table_association" "private_rt_assoc" {
  for_each = { for k, v in local.subnets : k => v if v.tier == "private" }

  subnet_id      = aws_subnet.this[each.key].id
  route_table_id = aws_route_table.db_rt.id
}
