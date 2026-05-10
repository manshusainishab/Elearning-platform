resource "aws_acm_certificate" "theta" {
  domain_name               = "thetalearning.work.gd"
  subject_alternative_names = ["www.thetalearning.work.gd"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_acm_certificate_validation" "theta" {
  certificate_arn = aws_acm_certificate.theta.arn
}
