provider "aws" {
  region  = "ap-south-1"
  profile = "new-aws"

  default_tags {
    tags = {
      Project     = "theta-elearning"
      Environment = "prod"
      ManagedBy   = "terraform"
    }
  }
}
