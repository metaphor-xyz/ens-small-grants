# ENS Small Grants
This is a semi-autonomous grant application designed to help ENS DAO distribute small grants to a wider range of projects at a regular rate.

- [ENS Public Goods Working Group grant proposal](https://discuss.ens.domains/t/pg-wg-proposal-ens-small-grants/12843)
- [Metaphor Product Spec](https://metaphorxyz.notion.site/ENS-Small-Grants-3d75af5ba7a64954b81eed23191fbfd4)

## Setup

Running the project:
```
> yarn install
> yarn dev
```

## Architecture
For the initial implementation, the focus is on speed of deployment, while retaining independent vote audit-ability.

- During the Proposal Stage, proposal text is stored in ARweave (via Bundlr) and indexed by a web2 Cloudflare Worker
- Once Proposal Stage is complete, a Cloudflare Worker function will be used to generate the Snapshot Proposal, where each Grant Proposal is a "choice" in a single-choice vote, including the arweave transaction ID
- Once on Voting Stage, the app uses Snapshot as the source of truth and no longer relies on the Cloudflare Worker

```mermaid
sequenceDiagram
    participant user as Web Client
    participant function as Cloudflare Worker
    participant arweave as Bundlr Network
    participant snapshot as Snapshot

    Note over user,snapshot: Proposal period begins
    user->>function: List grant proposals
    user->>arweave: Upload proposal data
    arweave->>user: Return Arweave transaction ID
    user->>function: Submit grant proposal
    Note over user,snapshot: Proposal period ends
    function->>snapshot: Create Snapshot proposal
    Note over user,snapshot: Voting period begins
    user->>snapshot: List grant proposals
    user->>snapshot: Vote for grant proposal
    Note over user,snapshot: Voting period ends
```

## License
This project is licensed under both MIT and Apache 2.0
