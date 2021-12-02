# Rugenerous Protocol

Converts yield provided by a lending protocol or yield optimizer to a different token.

## Overview

1. Users deposit an underlying token (e.g. MIM) to a Vault and receives a vault token 1-1 with underlying.
2. The vault uses a strategy (e.g. BTokenStrat) to deposit the underlying to a yield generator.
3. The Harvester continuously swaps yield to a target token (e.g. AVAX) and distributes it to vault token holders in the form of dividends.
4. Vault token holders can withdraw underlying and the target token at any time.