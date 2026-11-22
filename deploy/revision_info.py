"""Reads the image and DEPLOYED_COMMIT_SHA of a Cloud Run revision (Issue #48).

`gcloud run revisions describe --format=json` may return the Knative v1 shape (containers under
`spec`) or the Cloud Run v2 shape (containers at the top level), depending on the gcloud version.
Usage: gcloud run revisions describe REV --format=json | python3 deploy/revision_info.py
Prints: "<image> <commit>" (either may be empty).
"""
import json
import sys


def _containers(resource):
    for path in (("spec", "containers"), ("containers",), ("template", "containers")):
        node = resource
        for key in path:
            node = node.get(key) if isinstance(node, dict) else None
        if isinstance(node, list) and node:
            return node
    return []


def image_and_commit(revision):
    containers = _containers(revision)
    if not containers:
        return "", ""
    container = containers[0]
    env = {e.get("name"): e.get("value", "") for e in container.get("env", []) if isinstance(e, dict)}
    return container.get("image", "") or "", env.get("DEPLOYED_COMMIT_SHA", "") or ""


def verify(revision, repository, commit):
    """Return "" when the revision runs our image for `commit`, or a reason when it does not."""
    raise NotImplementedError


def format_line(text):
    image, commit = image_and_commit(json.loads(text))
    return f"{image} {commit}"


if __name__ == "__main__":
    print(format_line(sys.stdin.read()))
