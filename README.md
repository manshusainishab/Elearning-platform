# Theta E-Learning Platform — Backend

Backend API for the Theta e-learning platform. Serves course content, lecture videos, user authentication, payments, and progress tracking. Frontend lives in a separate repo and is deployed on Vercel.

- **Live API**: `https://www.thetalearning.work.gd`
- **Frontend**: `https://elearning-bice.vercel.app`

---

## Architecture

```
   Vercel frontend
        │
        │  HTTPS API calls
        ▼
   freedomain.one DNS  →  AWS ALB (HTTPS, ACM cert)
                                │
                                ▼
                      ECS Fargate task (Node + Express)
                          │           │
                          │           └──────► AWS Secrets Manager (env vars at task launch)
                          │
                          ├──────► AWS S3 (uploads bucket)
                          ├──────► AWS CloudWatch Logs
                          └──────► MongoDB Atlas (external SaaS)
```

All AWS infrastructure is defined in Terraform under [infra/](infra/) and runs in a single custom VPC across two availability zones in `ap-south-1`.

---

## Tech Stack

### Backend Runtime

| Layer | Choice | Purpose |
|---|---|---|
| Language / runtime | Node.js 20 (LTS) | JavaScript runtime |
| Web framework | Express 4 | HTTP routing, middleware |
| Module system | ESM (`"type": "module"`) | Native ES modules, top-level await |

### Persistence & State

| Concern | Service |
|---|---|
| Primary database | MongoDB Atlas (external) — accessed via Mongoose ODM |
| File / media storage | AWS S3 (private bucket, IAM-scoped reads from the backend) |
| Secrets at runtime | AWS Secrets Manager — JSON blob injected as env vars by ECS at task launch |

### Domain Libraries

| Library | Use |
|---|---|
| `mongoose` | MongoDB schemas + queries |
| `bcrypt` | Password hashing (native module — needs build toolchain in Docker) |
| `jsonwebtoken` | JWT-based auth |
| `multer` + `multer-s3` | File upload middleware (writes directly to S3) |
| `@aws-sdk/client-s3` | S3 client for read/delete (multer-s3 handles writes) |
| `nodemailer` | Email sending (Gmail SMTP for activation emails) |
| `razorpay` | Payment integration (Razorpay Orders API + signature verification) |
| `cors` | CORS middleware |
| `uuid` | Unique filenames for uploads |
| `dotenv` | Local-dev env var loading |

### Dev Tooling

| Tool | Purpose |
|---|---|
| `nodemon` | Hot-reload during local dev |
| `eslint` (flat config) | Linting |
| `husky` + `lint-staged` | Pre-commit hooks: ESLint runs on staged `.js` files |

### Infrastructure / DevOps

| Tool | Purpose |
|---|---|
| Terraform | All AWS infrastructure as code |
| Docker / Buildx | Container image build (linux/amd64 cross-build from Apple Silicon) |
| GitHub Actions | CI/CD — build, push, deploy |
| AWS OIDC | Federated identity for GitHub Actions (no static keys in repo) |

### AWS Services Used

| Service | Role |
|---|---|
| ECS Fargate | Container orchestration (serverless, no EC2 to manage) |
| ECR | Private Docker registry |
| ALB (Application Load Balancer) | HTTPS termination, health checks, request routing |
| ACM | TLS certificate (DNS-validated, auto-renews) |
| VPC + Subnets + IGW | Network isolation, public subnets across 2 AZs |
| Security Groups | Stateful firewalls (ALB SG → Task SG referencing pattern) |
| Secrets Manager | Credentials at rest, injected into ECS tasks at launch |
| S3 | Persistent storage for uploaded media |
| CloudWatch Logs | Container stdout/stderr (7-day retention) |
| IAM | Task execution role, task role, GitHub OIDC role |

---

## Repository Structure

```
Elearning-platform/
├── index.js                  # Express app entry point
├── package.json
├── Dockerfile                # node:20-bullseye-slim base image
├── .dockerignore             # excludes infra/, uploads/, .github/, etc.
├── controllers/              # Route handlers
│   ├── admin.js              # Course/lecture create + delete (S3 ops)
│   ├── course.js             # Course listing, fetch, payment + progress
│   └── user.js               # Auth, register, login, profile
├── routes/                   # Express routers
│   ├── admin.js
│   ├── course.js
│   └── user.js
├── models/                   # Mongoose schemas
│   ├── Courses.js
│   ├── Lecture.js
│   ├── User.js
│   ├── Payment.js
│   └── Progress.js
├── middlewares/
│   ├── isAuth.js             # JWT verification middleware
│   ├── multer.js              # multer-s3 storage engine
│   └── sendMail.js           # Nodemailer wrapper for activation emails
├── lib/
│   └── s3.js                 # Shared S3 client + bucket name export
├── database/
│   └── db.js                 # Mongoose connection
├── infra/                    # Terraform — all AWS resources
│   ├── versions.tf           # Terraform + AWS provider version pins
│   ├── providers.tf          # AWS provider config (region, profile)
│   ├── vpc.tf                # VPC, subnets, IGW, route tables
│   ├── security_groups.tf    # ALB SG + Task SG (cross-references)
│   ├── ecr.tf                # Container registry + lifecycle policy
│   ├── s3.tf                 # Uploads bucket + public access block + encryption
│   ├── ecs.tf                # ECS cluster + Fargate capacity provider
│   ├── task_def.tf           # Task definition (CPU, memory, env, secrets)
│   ├── service.tf            # ECS service (1 task, ALB integration, lifecycle ignore)
│   ├── alb.tf                # ALB + target group + HTTP/HTTPS listeners
│   ├── acm.tf                # TLS cert + validation waiter
│   ├── cloudwatch.tf         # Log group for task logs
│   ├── secrets.tf            # Empty Secrets Manager container
│   ├── iam_ecs.tf            # Task execution role + task role
│   ├── iam_github_oidc.tf    # OIDC provider + GitHub deploy role
│   └── outputs.tf            # ARNs / DNS names emitted after apply
└── .github/workflows/
    ├── ci.yml                # Build smoke test on every push to main
    └── release.yml           # Tag-triggered build + ECR push + ECS deploy
```

---

## How It Works

### Request flow

A request to `https://www.thetalearning.work.gd/api/courses`:

1. **DNS** — `www.thetalearning.work.gd` (CNAME) → ALB DNS → public IP.
2. **TLS** — handshake terminates at ALB; cert is from ACM, valid for `thetalearning.work.gd` + `www.thetalearning.work.gd`.
3. **ALB listener** on port 443 forwards to the target group (`theta-backend-tg`).
4. **Security group check** — task SG only allows port 5000 from the ALB SG by ID, not from the internet.
5. **Container handles request** — Express app on port 5000. Routes match, controller runs.
6. **DB / S3 / external calls** — egress through Internet Gateway. Auth uses task IAM role auto-discovered via ECS metadata service (`http://169.254.170.2`).

### Authentication

- Users sign up → email activation token (signed with `Activation_Secret`).
- Login → JWT issued (signed with `Jwt_Secret`).
- Subsequent requests include the JWT; `middlewares/isAuth.js` verifies and loads the user.

### File uploads

- Multer middleware uses `multer-s3` storage engine.
- Files are PUT directly to S3 with key `uploads/<uuid>.<ext>`.
- The key is stored in MongoDB on the course/lecture document.
- Reading a file: client requests `/uploads/<uuid>.<ext>` on the backend; the route handler streams the S3 object back.

### Payments

- `Razorpay_Key` and `Razorpay_Secret` are test-mode credentials.
- `POST /api/checkout/:id` creates a Razorpay order.
- After payment, the frontend POSTs the signed payment details; the backend verifies the HMAC signature (using `crypto.createHmac('sha256', Razorpay_Secret)`) and grants course access.

---

## Local Development

### Prerequisites

- Node.js 20+
- AWS CLI v2 with a profile that has `s3:GetObject`/`PutObject`/`DeleteObject` on the uploads bucket
- Docker Desktop (only if you want to test the container build locally)

### Setup

```bash
git clone https://github.com/manshusainishab/Elearning-platform.git
cd Elearning-platform
npm install

# Create .env (see Environment Variables section)
cp .env.example .env  # if an example exists, else create manually

npm run dev  # nodemon, port 5000
```

### Environment variables (local `.env`)

```
PORT=5000
DB=mongodb+srv://<user>:<pass>@<cluster>/ELearning?retryWrites=true&w=majority
Activation_Secret=<random string>
Jwt_Secret=<random string>
Password=<gmail app password>
Gmail=<sender email>
Razorpay_Key=<rzp_test_...>
Razorpay_Secret=<...>
frontendurl=http://localhost:5173
AWS_REGION=ap-south-1
AWS_PROFILE=<your local AWS CLI profile name>
S3_UPLOADS_BUCKET=theta-elearning-uploads-928705892455
```

`AWS_PROFILE` is **only set locally** — production tasks pick up credentials from the ECS task IAM role automatically.

### NPM scripts

| Script | What it does |
|---|---|
| `npm run dev` | nodemon with hot reload |
| `npm start` | `node index.js` (production-style) |

---

## Infrastructure (Terraform)

All AWS resources are defined in [infra/](infra/). State currently lives locally on the maintainer's machine — for collaborative use, migrate to an S3 remote backend with a DynamoDB lock table.

### Apply changes

```bash
cd infra
terraform init     # one-time, downloads AWS provider
terraform plan     # preview changes
terraform apply    # apply with confirmation
```

### What's pinned

- Terraform `>= 1.5`
- AWS provider `~> 5.0`
- Region `ap-south-1`
- AWS CLI profile `new-aws` (configured in [providers.tf](infra/providers.tf))

### Key design choices

- **Custom VPC, public subnets only** — no NAT gateway (~$32/mo savings), tasks have public IPs but are firewalled by security groups.
- **No Route 53** — DNS is at freedomain.one. Custom CAA record at the zone overrides the parent zone's `letsencrypt-only` policy to allow ACM/Amazon to issue certs.
- **Lifecycle ignore on ECS service** — `ignore_changes = [task_definition, desired_count]` so GitHub Actions deploys don't fight Terraform.
- **Secrets stored in Secrets Manager, not Terraform state** — TF creates the empty secret container; values are populated out-of-band via AWS CLI.

---

## CI/CD Pipeline

### `ci.yml` (every push to `main`)

1. Checkout code.
2. Docker build (no push) — confirms the Dockerfile still produces a valid image.

### `release.yml` (every tag matching `v*.*.*`)

1. **OIDC handshake**: GitHub issues a JWT, AWS STS verifies the trust policy condition (`sub = repo:manshusainishab/Elearning-platform:*`), returns 1-hour temporary credentials.
2. **Login to ECR** with `aws ecr get-login-password`.
3. **Buildx** cross-builds for `linux/amd64` (Fargate's platform), tags both `v*.*.*` and `latest`, pushes to ECR.
4. **Deploy job**:
   - `aws ecs describe-task-definition` fetches current revision JSON.
   - `jq` patches the `image` field, strips read-only fields.
   - `aws ecs register-task-definition` creates a new revision.
   - `aws ecs update-service --task-definition theta-backend` rolls the service to the new revision (family-name resolution always picks the latest).
5. ECS pulls the new image, drains old task, starts new task, ALB health checks pass, traffic flows to the new task.

Total time: ~3-4 min per release.

### To trigger a release

```bash
git tag v0.1.0
git push origin v0.1.0
```

Watch progress at: `https://github.com/manshusainishab/Elearning-platform/actions`

---

## Approximate Monthly Cost

For an idle (low-traffic) deployment:

| Service | Cost |
|---|---|
| ECS Fargate (256 CPU, 512 MB, 24/7) | ~$8 |
| ALB | ~$16 |
| ECR (200MB image) | ~$0.10 |
| S3 (small storage + low requests) | ~$0.10 |
| Secrets Manager (1 secret) | $0.40 |
| CloudWatch Logs (7-day retention) | ~$0.10 |
| Data transfer | ~$0 (free tier covers it) |
| **Total** | **~$25/mo** |

---

## Useful Commands

### Tail backend logs
```bash
aws logs tail /ecs/theta-backend --follow --profile new-aws --region ap-south-1
```

### Force a new deployment without a code change (e.g., after env var update)
```bash
aws ecs update-service \
  --cluster theta-cluster \
  --service theta-backend \
  --force-new-deployment \
  --profile new-aws
```

### Rotate a secret
```bash
${EDITOR} /tmp/secrets.json   # write the JSON manually
aws secretsmanager put-secret-value \
  --secret-id arn:aws:secretsmanager:ap-south-1:928705892455:secret:theta-app-secrets-inIcmx \
  --secret-string file:///tmp/secrets.json \
  --profile new-aws
rm /tmp/secrets.json
# Force a new task to pick up the new values:
aws ecs update-service --cluster theta-cluster --service theta-backend \
  --force-new-deployment --profile new-aws
```

### List uploads in S3
```bash
aws s3 ls s3://theta-elearning-uploads-928705892455/uploads/ --profile new-aws
```

### Check current ECS service health
```bash
aws ecs describe-services --cluster theta-cluster --services theta-backend \
  --profile new-aws --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Events:events[0:3]}'
```

---

## Future Improvements

These were deliberately scoped out of the initial setup; pick up as needs grow:

- **Remote Terraform state** (S3 backend + DynamoDB lock) so CI / multiple maintainers can apply.
- **Terraform plan in PR comments** via a third GitHub Actions workflow.
- **Private subnets + NAT Gateway** for defense-in-depth (worth ~$32/mo at production scale).
- **CloudFront** in front of ALB for global edge caching + DDoS protection.
- **WAF** with OWASP managed rule sets on the ALB.
- **ECS service autoscaling** based on CPU or request count.
- **CloudWatch alarms** for error rate, task count, latency.
- **Multi-stage Dockerfile** to drop the build toolchain from the runtime image (~250MB savings).
- **Presigned S3 URLs** for direct frontend → S3 uploads (skips backend egress).
