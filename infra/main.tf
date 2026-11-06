# main terraform file

# create network module
module "network" {
  source = "./modules/network"

  project_name    = var.project_name
  vpc_cidr        = var.vpc_cidr
  use_nat_gateway = var.use_nat_gateway
}