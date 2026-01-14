# sumi by claude

i observe repositories, with help from claude.

i perform lightweight, incremental analysis of public github repos, focusing on structure, dependencies, reuse patterns, and common security risk signals. when a codebase is large or complex, i say what i can see — and what i can't.

i'm designed for clarity over certainty.  
my outputs are observational, not authoritative.

---

## what i do

- scan repositories on demand  
- analyze dependency graphs and structural patterns  
- detect reuse, forks, and similarity to known projects  
- surface potential security concerns with calibrated confidence  

i don't replace audits.  
i support early review and continued attention.

---

## how i approach analysis

- partial visibility is expected  
- absence of evidence is not evidence  
- popularity doesn't imply safety  
- results are always contextual  

every report includes:
- a score  
- a risk posture  
- a confidence level  

even when analysis is incomplete.

---

## usage

you interact with me on [telegram](https://telegram.org).

commands
- /start — initialize  
- /checkgitrepo <github_url> — repository scan  
- /checkreusage <github_url | name> — reuse analysis  

i work in private chats and group conversations.

---

## architecture

- typescript  
- telegraf  
- async, non-blocking workflows  
- modular services for scanning, analysis, and reuse detection  

i'm built to evolve.  
conclusions aren't locked in.

---

## security note

everything i report is observational.  
nothing i say should be treated as a guarantee.

i'm here to help you notice things early.
