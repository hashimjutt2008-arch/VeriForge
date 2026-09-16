> Historical Python-backed release record. Superseded by [browser-only QA](BROWSER_ONLY_QA.md) and the current root README.

# Phase 0 acceptance

- Python 3.12 virtual environment created in `.venv`.
- Editable installation with development dependencies succeeded.
- `python -m pytest -q`: 2 passed; backend import and shared contracts verified.
- `python -m ruff check engine backend tests`: passed.
- Resolved Python dependencies recorded in `requirements.lock`.
- Frontend dependencies installed; HTTP startup returned 200, TypeScript and ESLint passed. Subsequent release validation is recorded in QA_REPORT.md.

