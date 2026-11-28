"""Reads the image and DEPLOYED_COMMIT_SHA of a Cloud Run revision (Issue #48).

`gcloud run revisions describe --format=json` may return the Knative v1 shape (containers under
`spec`) or the Cloud Run v2 shape (containers at the top level), depending on the gcloud version.
Usage: gcloud run revisions describe REV --format=json | python3 deploy/revision_info.py
Prints: "<image> <commit>" (either may be empty).
With --verify REPOSITORY COMMIT: prints the running image, or exits 1 with the reason.
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
    """Return "" when the revision runs our image for `commit`, or a reason when it does not.

    The digest is not compared with the tag's digest: a pushed tag can point to an image index while
    Cloud Run records the platform manifest it resolved (deploy run 44985131642, Issue #48).
    """
    image, recorded = image_and_commit(revision)
    name = image.split("@", 1)[0]
    if "@" not in image and ":" in name.rsplit("/", 1)[-1]:
        name = name.rsplit(":", 1)[0]  # drop a tag such as :latest
    if name != repository:
        return f"revision image is not from repository {repository}: '{image or 'none'}'"
    if "@sha256:" not in image:
        return f"revision image is not pinned by a digest: '{image}'"
    if recorded != commit:
        return f"revision records commit '{recorded or 'none'}', not {commit}"
    return ""


def format_line(text):
    image, commit = image_and_commit(json.loads(text))
    return f"{image} {commit}"


if __name__ == "__main__":
    text = sys.stdin.read()
    if len(sys.argv) == 4 and sys.argv[1] == "--verify":
        reason = verify(json.loads(text), sys.argv[2], sys.argv[3])
        if reason:
            print(reason, file=sys.stderr)
            sys.exit(1)
        print(image_and_commit(json.loads(text))[0])
    else:
        print(format_line(text))
