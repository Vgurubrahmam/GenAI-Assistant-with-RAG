
import sys
import os

# Add the current directory to sys.path to simulate running as a module or with PYTHONPATH=.
# But first, let's see if it fails without it when running this script from the same dir.
# If I run `python reproduce_issue.py` from `v2_openai_rag`, `sys.path[0]` is `v2_openai_rag`.
# So `import app` should work if `app` is a package in `v2_openai_rag`.

print(f"Current working directory: {os.getcwd()}")
print(f"sys.path[0]: {sys.path[0]}")

try:
    import app.db.models
    print("Import app.db.models successful")
except ImportError as e:
    print(f"Import app.db.models failed: {e}")

try:
    from app.db.models import Document
    print("from app.db.models import Document successful")
except ImportError as e:
    print(f"from app.db.models import Document failed: {e}")
