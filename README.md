# Agent Fee Recovery

I built an app that works great in Google - sheets and Appsheet. It starts with a form that the Brokers fill with agent FMLS personal deal submission info to get a refund of fees, that goes to a spreadsheet where it shows Pending. On a different tab there is place for accounting, when we get the monthly invoice from FMLS, to enter the FMLS number and amount of the credit from FMLS. The app/spreadsheet matches the FMLS number automatically and changes the status to Approved with a button for Process Refund. Once the refund has been issued and button clicked the line item then moves to the archive tab in the spreadsheet. There is a dashboard that shows Pending, Approved, Processed History which is all we want the transactions team to work with. The spreadsheet is behind the scenes except for the person who enters the credit FMLS number from the invoice (unless there is better way for this step).  I now need to move/re-create this over to Lovable + Supabase for eXp. Can I share a link to that app that is still in prototype status or what is the best way to do this?

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ecf5748a-df64-48a6-a711-90d1e8210680).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
