# Tests for BullMQ Queue Infrastructure

This directory contains unit tests for the distributed queue setup and selection logic.

## Test Files
- `bullmqQueue.test.ts`: Tests queue creation, job addition, and worker processing.
- `queueSelection.test.ts`: Tests queue selection logic for different job types.

## Running Tests

From the project root:

```
npx tsx scripts/run-tests-with-output.ts --pattern "queue" --comment "Testing BullMQ queue infrastructure"
```

Or using the enhanced test runner scripts as described in the project documentation.

## Coverage
- All core queue setup and selection logic is covered.
- Add more tests as new features or routing logic are implemented.

## References
- See `../../docs/RAG_Distributed_Queue_Implementation_Plan.md` for design details.
