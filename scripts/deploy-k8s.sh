#!/bin/bash
# Deploy CodeCity to a local Kubernetes cluster using Bazel
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$REPO_ROOT"

echo "=== CodeCity Kubernetes Deployment ==="
echo ""

# Detect K8s environment
detect_k8s_env() {
    if command -v minikube &> /dev/null && minikube status &> /dev/null; then
        echo 'minikube'
    elif command -v kind &> /dev/null && kind get clusters 2>/dev/null | grep -q .; then
        echo 'kind'
    elif kubectl config current-context 2>/dev/null | grep -q 'docker-desktop'; then
        echo 'docker-desktop'
    else
        echo 'unknown'
    fi
}

K8S_ENV=$(detect_k8s_env)
echo "Detected Kubernetes environment: $K8S_ENV"
echo ""

# Step 1: Build and load images
echo "=== Step 1: Building and loading container images ==="
echo ""

echo "Loading backend image into Docker..."
bazel run //backend:image_tarball

echo ""
echo "Loading frontend image into Docker..."
bazel run //frontend:image_tarball

# Load into K8s cluster if needed
case $K8S_ENV in
    minikube)
        echo ""
        echo "Loading images into minikube..."
        minikube image load codecity-backend:latest
        minikube image load codecity-frontend:latest
        ;;
    kind)
        CLUSTER=$(kind get clusters | head -1)
        echo ""
        echo "Loading images into kind cluster: $CLUSTER"
        kind load docker-image codecity-backend:latest --name "$CLUSTER"
        kind load docker-image codecity-frontend:latest --name "$CLUSTER"
        ;;
    docker-desktop)
        echo "Images already available in Docker Desktop Kubernetes"
        ;;
    *)
        echo "Warning: Unknown K8s environment. Images loaded to Docker only."
        ;;
esac

# Step 2: Deploy to Kubernetes
echo ""
echo "=== Step 2: Deploying to Kubernetes ==="
echo ""

kubectl apply -k k8s/

echo ""
echo "Waiting for deployments to be ready..."
kubectl rollout status deployment/codecity-backend -n codecity --timeout=120s
kubectl rollout status deployment/codecity-frontend -n codecity --timeout=120s

echo ""
echo "=== Deployment complete! ==="
echo ""
echo "Access the application:"
echo "  kubectl port-forward -n codecity svc/frontend 3000:80"
echo "  Then open: http://localhost:3000"
echo ""
echo "Or run: bazel run //k8s:port_forward"
