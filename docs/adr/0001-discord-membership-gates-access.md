# Discord membership gates access; GitHub is the login

_Partly superseded by [0003](0003-membership-checked-once-admin-hides-and-deletes.md): membership is now checked only until it first passes, and only the Admin hides Members._

Members sign in with GitHub, then must connect Discord, and the app checks they are in the TOLC server at each login and daily during a session. GitHub alone can't prove someone is in TOLC, and invite links or manual approval would add Admin work; linking both accounts also ties each Member's Discord handle to their GitHub identity, which often differ. A Member who leaves the server is hidden from the Directory (not deleted) until they rejoin. Each check runs on the Member's own page load with their own Discord token, so a Member who leaves and never signs in again stays listed until a bot-based sweep exists (#16).
