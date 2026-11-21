"""Offline tests for deploy/revision_info.py (Issue #48). Run: python3 -m unittest discover -s deploy/tests"""
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import revision_info  # noqa: E402

DIGEST = "asia-southeast1-docker.pkg.dev/cpe334-hairroot/hairroot/hairroot@sha256:" + "a" * 64
SHA = "e1a408af040abfe7dce75fb42249e6418b73435d"
ENV = [
    {"name": "NODE_ENV", "value": "production"},
    {"name": "DATABASE_URL", "valueFrom": {"secretKeyRef": {"name": "hairroot-database-url", "key": "latest"}}},
    {"name": "DEPLOYED_COMMIT_SHA", "value": SHA},
]

# Knative serving.knative.dev/v1 shape: containers under spec.
V1 = {"apiVersion": "serving.knative.dev/v1", "kind": "Revision", "spec": {"containers": [{"image": DIGEST, "env": ENV}]}}
# Cloud Run Admin API v2 shape: containers at the top level.
V2 = {"name": "projects/p/locations/r/services/hairroot/revisions/x", "containers": [{"image": DIGEST, "env": ENV}]}


class RevisionInfoTest(unittest.TestCase):
    def test_reads_v1_shape(self):
        self.assertEqual(revision_info.image_and_commit(V1), (DIGEST, SHA))

    def test_reads_v2_shape(self):
        self.assertEqual(revision_info.image_and_commit(V2), (DIGEST, SHA))

    def test_missing_values_are_empty(self):
        self.assertEqual(revision_info.image_and_commit({"spec": {}}), ("", ""))

    def test_command_line_prints_image_then_commit(self):
        self.assertEqual(revision_info.format_line(json.dumps(V2)), f"{DIGEST} {SHA}")


if __name__ == "__main__":
    unittest.main()
