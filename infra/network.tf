# This file contains the network resources for the CodePulse project.


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

resource "aws_subnet" "this" {
  for_each = local.subnets

  vpc_id            = aws_vpc.main_vpc.id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az

  tags = {
    Name = "${var.project_name}-${each.key}"
  }
}

resource "aws_internet_gateway" "main_gw" {
  vpc_id = aws_vpc.main_vpc.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

resource "aws_eip" "nat" {
  count  = var.use_nat_gateway ? 1 : 0
  domain = "vpc"

  tags = {
    Name = "${var.project_name}-nat-eip"
  }
}

resource "aws_nat_gateway" "main_nat" {
  count = var.use_nat_gateway ? 1 : 0

  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.this["public_a"].id

  tags = {
    Name = "${var.project_name}-nat"
  }
}

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

resource "aws_route_table_association" "public_rt_assoc" {
  for_each = { for k, v in local.subnets : k => v if v.tier == "public" }

  subnet_id      = aws_subnet.this[each.key].id
  route_table_id = aws_route_table.public_rt.id
}
