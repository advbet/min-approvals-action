# Min approvals GitHub Action

Sets minimum number of approvals through PR labels. Label pattern `min-{number}-approvals`. If you want to get approvals
from all reviewers please use `min-all-approvals`. It will always use only the first matched label.

## Usage

```yml
name: Min approvals

on:
  pull_request:
    types: [labeled, unlabeled]
  pull_request_review:
    types: [submitted, dismissed]

jobs:
  approved-by:
    runs-on: ubuntu-slim

    steps:
      - uses: advbet/min-approvals-action@v2
```
