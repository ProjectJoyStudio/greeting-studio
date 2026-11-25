# PVG reliability regression
- Unit: `bunx vitest run src/lib/personal-video` (signature, backoff, ambiguous polling, no-speaker prompt).
- Isolated DB + real local scheduler: `PVG_TEST_WRITE=yes python3 tests/pvg_reliability_integration.py` (disposable accounts, no paid provider calls).
