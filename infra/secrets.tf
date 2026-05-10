resource "aws_secretsmanager_secret" "app" {
  name        = "theta-app-secrets"
  description = "App env vars: DB connection, JWT secret, Razorpay keys, Gmail credentials"
}
