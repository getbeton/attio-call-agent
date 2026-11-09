<p align="center"><img src="assets/header.png" alt="Attio call agent: call recording to CRM update, next steps and recap email, approved in Telegram" width="100%"></p>

# Attio Call Agent

**After a sales call, this agent sends you a Telegram card with the CRM changes, the next steps and a recap email. You ask questions or give changes in text or voice. You apply each part with one button. Between calls, the same bot answers questions about your Attio CRM.**

[![License: MIT](https://img.shields.io/badge/license-MIT-black.svg)](LICENSE)
![Node 24](https://img.shields.io/badge/node-24-black.svg)
![Pi SDK](https://img.shields.io/badge/agent-Pi%20SDK-black.svg)
![Model: grok](https://img.shields.io/badge/model-grok--4.7-black.svg)

Made by the team of [Sell to State](https://www.selltostate.com/?utm_source=github&utm_medium=referral&utm_campaign=sts-public-repos&utm_content=attio-call-agent): government tenders and contract awards from official sources in 70+ countries, in one schema.

<!-- ask-ai:start -->
<p align="center"><sub>Ask AI about this repo</sub></p>
<p align="center">
  <a href="https://claude.ai/new?q=Read%20https%3A%2F%2Fgithub.com%2Fgetbeton%2Fattio-call-agent.%20Help%20me%20deploy%20this%20agent%3A%20it%20turns%20Attio%20call%20recordings%20into%20CRM%20updates%2C%20next%20steps%20and%20recap%20emails%20that%20I%20approve%20in%20Telegram.%20First%20ask%20me%20where%20I%20want%20to%20host%20it."><img src="https://img.shields.io/badge/Claude-111111?style=for-the-badge&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyBmaWxsPSIjZmZmZmZmIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGhlaWdodD0iMWVtIiBzdHlsZT0iZmxleDpub25lO2xpbmUtaGVpZ2h0OjEiIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjFlbSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU%2BQ2xhdWRlPC90aXRsZT48cGF0aCBkPSJNNC43MDkgMTUuOTU1bDQuNzItMi42NDcuMDgtLjIzLS4wOC0uMTI4SDkuMmwtLjc5LS4wNDgtMi42OTgtLjA3My0yLjMzOS0uMDk3LTIuMjY2LS4xMjItLjU3MS0uMTIxTDAgMTEuNzg0bC4wNTUtLjM1Mi40OC0uMzIxLjY4Ni4wNiAxLjUyLjEwMyAyLjI3OC4xNTggMS42NTIuMDk3IDIuNDQ5LjI1NWguMzg5bC4wNTUtLjE1Ny0uMTM0LS4wOTgtLjEwMy0uMDk3LTIuMzU4LTEuNTk2LTIuNTUyLTEuNjg4LTEuMzM2LS45NzItLjcyNC0uNDkxLS4zNjQtLjQ2Mi0uMTU4LTEuMDA4LjY1Ni0uNzIyLjg4MS4wNi4yMjUuMDYxLjg5My42ODYgMS45MDggMS40NzYgMi40OTEgMS44MzMuMzY1LjMwNC4xNDUtLjEwMy4wMTktLjA3My0uMTY0LS4yNzQtMS4zNTUtMi40NDYtMS40NDYtMi40OS0uNjQ0LTEuMDMyLS4xNy0uNjE5YTIuOTcgMi45NyAwIDAxLS4xMDQtLjcyOUw2LjI4My4xMzQgNi42OTYgMGwuOTk2LjEzNC40Mi4zNjQuNjIgMS40MTQgMS4wMDIgMi4yMjkgMS41NTUgMy4wMy40NTYuODk4LjI0My44MzIuMDkxLjI1NWguMTU4VjkuMDFsLjEyOC0xLjcwNi4yMzctMi4wOTUuMjMtMi42OTUuMDgtLjc2LjM3Ni0uOTEuNzQ3LS40OTIuNTg0LjI4LjQ4LjY4NS0uMDY3LjQ0NC0uMjg2IDEuODUxLS41NTkgMi45MDMtLjM2NCAxLjk0MmguMjEybC4yNDMtLjI0Mi45ODUtMS4zMDYgMS42NTItMi4wNjQuNzMtLjgyLjg1LS45MDQuNTQ3LS40MzFoMS4wMzNsLjc2IDEuMTI5LS4zNCAxLjE2Ni0xLjA2NCAxLjM0Ny0uODgxIDEuMTQyLTEuMjY0IDEuNy0uNzkgMS4zNi4wNzMuMTEuMTg4LS4wMiAyLjg1Ni0uNjA2IDEuNTQzLS4yOCAxLjg0MS0uMzE1LjgzMy4zODguMDkxLjM5NS0uMzI4LjgwNy0xLjk2OS40ODYtMi4zMDkuNDYyLTMuNDM5LjgxMy0uMDQyLjAzLjA0OS4wNjEgMS41NDkuMTQ2LjY2Mi4wMzZoMS42MjJsMy4wMi4yMjUuNzkuNTIyLjQ3NC42MzgtLjA3OS40ODUtMS4yMTUuNjItMS42NC0uMzg5LTMuODI5LS45MS0xLjMxMi0uMzI5aC0uMTgydi4xMWwxLjA5MyAxLjA2OCAyLjAwNiAxLjgxIDIuNTA5IDIuMzMuMTI3LjU3OC0uMzIyLjQ1NS0uMzQtLjA0OS0yLjIwNS0xLjY1Ny0uODUxLS43NDctMS45MjYtMS42MmgtLjEyOHYuMTdsLjQ0NC42NDkgMi4zNDUgMy41MjEuMTIyIDEuMDgtLjE3LjM1My0uNjA4LjIxMy0uNjY4LS4xMjItMS4zNzQtMS45MjUtMS40MTUtMi4xNjctMS4xNDMtMS45NDMtLjE0LjA4LS42NzQgNy4yNTQtLjMxNi4zNy0uNzI5LjI4LS42MDctLjQ2MS0uMzIyLS43NDcuMzIyLTEuNDc2LjM4OS0xLjkyNC4zMTUtMS41My4yODYtMS45LjE3LS42MzItLjAxMi0uMDQyLS4xNC4wMTgtMS40MzQgMS45NjctMi4xOCAyLjk0NS0xLjcyNiAxLjg0NS0uNDE0LjE2NC0uNzE3LS4zNy4wNjctLjY2Mi40MDEtLjU4OSAyLjM4OC0zLjAzNiAxLjQ0LTEuODgyLjkzLTEuMDg2LS4wMDYtLjE1OGgtLjA1NUw0LjEzMiAxOC41NmwtMS4xMy4xNDYtLjQ4Ny0uNDU2LjA2MS0uNzQ2LjIzMS0uMjQzIDEuOTA4LTEuMzEyLS4wMDYuMDA2eiI%2BPC9wYXRoPjwvc3ZnPg%3D%3D" alt="Ask Claude about this repo" height="28"></a>
  <a href="https://chatgpt.com/?q=Read%20https%3A%2F%2Fgithub.com%2Fgetbeton%2Fattio-call-agent.%20Help%20me%20deploy%20this%20agent%3A%20it%20turns%20Attio%20call%20recordings%20into%20CRM%20updates%2C%20next%20steps%20and%20recap%20emails%20that%20I%20approve%20in%20Telegram.%20First%20ask%20me%20where%20I%20want%20to%20host%20it."><img src="https://img.shields.io/badge/ChatGPT-111111?style=for-the-badge&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyBmaWxsPSIjZmZmZmZmIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGhlaWdodD0iMWVtIiBzdHlsZT0iZmxleDpub25lO2xpbmUtaGVpZ2h0OjEiIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjFlbSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU%2BT3BlbkFJPC90aXRsZT48cGF0aCBkPSJNOS4yMDUgOC42NTh2LTIuMjZjMC0uMTkuMDcyLS4zMzMuMjM4LS40MjhsNC41NDMtMi42MTZjLjYxOS0uMzU3IDEuMzU2LS41MjMgMi4xMTctLjUyMyAyLjg1NCAwIDQuNjYyIDIuMjEyIDQuNjYyIDQuNTY2IDAgLjE2NyAwIC4zNTctLjAyNC41NDdsLTQuNzEtMi43NTlhLjc5Ny43OTcgMCAwMC0uODU2IDBsLTUuOTcgMy40NzN6bTEwLjYwOSA4LjhWMTIuMDZjMC0uMzMzLS4xNDMtLjU3LS40MjktLjczN2wtNS45Ny0zLjQ3MyAxLjk1LTEuMTE4YS40MzMuNDMzIDAgMDEuNDc2IDBsNC41NDMgMi42MTdjMS4zMDkuNzYgMi4xODkgMi4zNzggMi4xODkgMy45NDggMCAxLjgwOC0xLjA3IDMuNDczLTIuNzYgNC4xNjN6TTcuODAyIDEyLjcwM2wtMS45NS0xLjE0MmMtLjE2Ny0uMDk1LS4yMzktLjIzOC0uMjM5LS40MjhWNS44OTljMC0yLjU0NSAxLjk1LTQuNDcyIDQuNTkxLTQuNDcyIDEgMCAxLjkyNy4zMzMgMi43MTIuOTI4TDguMjMgNS4wNjdjLS4yODUuMTY2LS40MjguNDA0LS40MjguNzM3djYuODk4ek0xMiAxNS4xMjhsLTIuNzk1LTEuNTd2LTMuMzNMMTIgOC42NThsMi43OTUgMS41N3YzLjMzTDEyIDE1LjEyOHptMS43OTYgNy4yM2MtMSAwLTEuOTI3LS4zMzItMi43MTItLjkyN2w0LjY4Ni0yLjcxMmMuMjg1LS4xNjYuNDI4LS40MDQuNDI4LS43Mzd2LTYuODk4bDEuOTc0IDEuMTQyYy4xNjcuMDk1LjIzOC4yMzguMjM4LjQyOHY1LjIzM2MwIDIuNTQ1LTEuOTc0IDQuNDcyLTQuNjE0IDQuNDcyem0tNS42MzctNS4zMDNsLTQuNTQ0LTIuNjE3Yy0xLjMwOC0uNzYxLTIuMTg4LTIuMzc4LTIuMTg4LTMuOTQ4QTQuNDgyIDQuNDgyIDAgMDE0LjIxIDYuMzI3djUuNDIzYzAgLjMzMy4xNDMuNTcxLjQyOC43MzhsNS45NDcgMy40NDktMS45NSAxLjExOGEuNDMyLjQzMiAwIDAxLS40NzYgMHptLS4yNjIgMy45Yy0yLjY4OCAwLTQuNjYyLTIuMDIxLTQuNjYyLTQuNTE5IDAtLjE5LjAyNC0uMzguMDQ3LS41N2w0LjY4NiAyLjcxYy4yODYuMTY3LjU3MS4xNjcuODU2IDBsNS45Ny0zLjQ0OHYyLjI2YzAgLjE5LS4wNy4zMzMtLjIzNy40MjhsLTQuNTQzIDIuNjE2Yy0uNjE5LjM1Ny0xLjM1Ni41MjMtMi4xMTcuNTIzem01Ljg5OSAyLjgzYTUuOTQ3IDUuOTQ3IDAgMDA1LjgyNy00Ljc1NkMyMi4yODcgMTguMzM5IDI0IDE1Ljg0IDI0IDEzLjI5NmMwLTEuNjY1LS43MTMtMy4yODItMS45OTgtNC40NDguMTE5LS41LjE5LS45OTkuMTktMS40OTggMC0zLjQwMS0yLjc1OS01Ljk0Ny01Ljk0Ni01Ljk0Ny0uNjQyIDAtMS4yNi4wOTUtMS44OC4zMUE1Ljk2MiA1Ljk2MiAwIDAwMTAuMjA1IDBhNS45NDcgNS45NDcgMCAwMC01LjgyNyA0Ljc1N0MxLjcxMyA1LjQ0NyAwIDcuOTQ1IDAgMTAuNDljMCAxLjY2Ni43MTMgMy4yODMgMS45OTggNC40NDgtLjExOS41LS4xOSAxLS4xOSAxLjQ5OSAwIDMuNDAxIDIuNzU5IDUuOTQ2IDUuOTQ2IDUuOTQ2LjY0MiAwIDEuMjYtLjA5NSAxLjg4LS4zMDlhNS45NiA1Ljk2IDAgMDA0LjE2MiAxLjcxM3oiPjwvcGF0aD48L3N2Zz4%3D" alt="Ask ChatGPT about this repo" height="28"></a>
  <a href="https://www.google.com/search?udm=50&q=Read%20https%3A%2F%2Fgithub.com%2Fgetbeton%2Fattio-call-agent.%20Help%20me%20deploy%20this%20agent%3A%20it%20turns%20Attio%20call%20recordings%20into%20CRM%20updates%2C%20next%20steps%20and%20recap%20emails%20that%20I%20approve%20in%20Telegram.%20First%20ask%20me%20where%20I%20want%20to%20host%20it."><img src="https://img.shields.io/badge/Gemini-111111?style=for-the-badge&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyBmaWxsPSIjZmZmZmZmIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGhlaWdodD0iMWVtIiBzdHlsZT0iZmxleDpub25lO2xpbmUtaGVpZ2h0OjEiIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjFlbSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU%2BR2VtaW5pPC90aXRsZT48cGF0aCBkPSJNMjAuNjE2IDEwLjgzNWExNC4xNDcgMTQuMTQ3IDAgMDEtNC40NS0zLjAwMSAxNC4xMTEgMTQuMTExIDAgMDEtMy42NzgtNi40NTIuNTAzLjUwMyAwIDAwLS45NzUgMCAxNC4xMzQgMTQuMTM0IDAgMDEtMy42NzkgNi40NTIgMTQuMTU1IDE0LjE1NSAwIDAxLTQuNDUgMy4wMDFjLS42NS4yOC0xLjMxOC41MDUtMi4wMDIuNjc4YS41MDIuNTAyIDAgMDAwIC45NzVjLjY4NC4xNzIgMS4zNS4zOTcgMi4wMDIuNjc3YTE0LjE0NyAxNC4xNDcgMCAwMTQuNDUgMy4wMDEgMTQuMTEyIDE0LjExMiAwIDAxMy42NzkgNi40NTMuNTAyLjUwMiAwIDAwLjk3NSAwYy4xNzItLjY4NS4zOTctMS4zNTEuNjc3LTIuMDAzYTE0LjE0NSAxNC4xNDUgMCAwMTMuMDAxLTQuNDUgMTQuMTEzIDE0LjExMyAwIDAxNi40NTMtMy42NzguNTAzLjUwMyAwIDAwMC0uOTc1IDEzLjI0NSAxMy4yNDUgMCAwMS0yLjAwMy0uNjc4eiI%2BPC9wYXRoPjwvc3ZnPg%3D%3D" alt="Ask Gemini about this repo" height="28"></a>
  <a href="https://grok.com/?q=Read%20https%3A%2F%2Fgithub.com%2Fgetbeton%2Fattio-call-agent.%20Help%20me%20deploy%20this%20agent%3A%20it%20turns%20Attio%20call%20recordings%20into%20CRM%20updates%2C%20next%20steps%20and%20recap%20emails%20that%20I%20approve%20in%20Telegram.%20First%20ask%20me%20where%20I%20want%20to%20host%20it."><img src="https://img.shields.io/badge/Grok-111111?style=for-the-badge&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyBmaWxsPSIjZmZmZmZmIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGhlaWdodD0iMWVtIiBzdHlsZT0iZmxleDpub25lO2xpbmUtaGVpZ2h0OjEiIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjFlbSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU%2BR3JvazwvdGl0bGU%2BPHBhdGggZD0iTTkuMjcgMTUuMjlsNy45NzgtNS44OTdjLjM5MS0uMjkuOTUtLjE3NyAxLjEzNy4yNzIuOTggMi4zNjkuNTQyIDUuMjE1LTEuNDEgNy4xNjktMS45NTEgMS45NTQtNC42NjcgMi4zODItNy4xNDkgMS40MDZsLTIuNzExIDEuMjU3YzMuODg5IDIuNjYxIDguNjExIDIuMDAzIDExLjU2Mi0uOTUzIDIuMzQxLTIuMzQ0IDMuMDY2LTUuNTM5IDIuMzg4LTguNDJsLjAwNi4wMDdjLS45ODMtNC4yMzIuMjQyLTUuOTI0IDIuNzUtOS4zODMuMDYtLjA4Mi4xMi0uMTY0LjE3OS0uMjQ4bC0zLjMwMSAzLjMwNXYtLjAxTDkuMjY3IDE1LjI5Mk03LjYyMyAxNi43MjNjLTIuNzkyLTIuNjctMi4zMS02LjgwMS4wNzEtOS4xODQgMS43NjEtMS43NjMgNC42NDctMi40ODMgNy4xNjYtMS40MjVsMi43MDUtMS4yNWE3LjgwOCA3LjgwOCAwIDAwLTEuODI5LTFBOC45NzUgOC45NzUgMCAwMDUuOTg0IDUuODNjLTIuNTMzIDIuNTM2LTMuMzMgNi40MzYtMS45NjIgOS43NjQgMS4wMjIgMi40ODctLjY1MyA0LjI0Ni0yLjM0IDYuMDIyLS41OTkuNjMtMS4xOTkgMS4yNTktMS42ODIgMS45MjVsNy42Mi02LjgxNSI%2BPC9wYXRoPjwvc3ZnPg%3D%3D" alt="Ask Grok about this repo" height="28"></a>
  <a href="https://www.perplexity.ai/search?q=Read%20https%3A%2F%2Fgithub.com%2Fgetbeton%2Fattio-call-agent.%20Help%20me%20deploy%20this%20agent%3A%20it%20turns%20Attio%20call%20recordings%20into%20CRM%20updates%2C%20next%20steps%20and%20recap%20emails%20that%20I%20approve%20in%20Telegram.%20First%20ask%20me%20where%20I%20want%20to%20host%20it."><img src="https://img.shields.io/badge/Perplexity-111111?style=for-the-badge&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyBmaWxsPSIjZmZmZmZmIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGhlaWdodD0iMWVtIiBzdHlsZT0iZmxleDpub25lO2xpbmUtaGVpZ2h0OjEiIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjFlbSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU%2BUGVycGxleGl0eTwvdGl0bGU%2BPHBhdGggZD0iTTE5Ljc4NSAwdjcuMjcySDIyLjVWMTcuNjJoLTIuOTM1VjI0bC03LjAzNy02LjE5NHY2LjE0NWgtMS4wOTF2LTYuMTUyTDQuMzkyIDI0di02LjQ2NUgxLjVWNy4xODhoMi44ODRWMGw3LjA1MyA2LjQ5NFYuMTloMS4wOXY2LjQ5TDE5Ljc4NiAwem0tNy4yNTcgOS4wNDR2Ny4zMTlsNS45NDYgNS4yMzRWMTQuNDRsLTUuOTQ2LTUuMzk3em0tMS4wOTktLjA4bC01Ljk0NiA1LjM5OHY3LjIzNWw1Ljk0Ni01LjIzNFY4Ljk2NXptOC4xMzYgNy41OGgxLjg0NFY4LjM0OUgxMy40Nmw2LjEwNSA1LjU0djIuNjU1em0tOC45ODItOC4yOEgyLjU5djguMTk1aDEuOHYtMi41NzZsNi4xOTItNS42MnpNNS40NzUgMi40NzZ2NC43MWg1LjExNWwtNS4xMTUtNC43MXptMTMuMjE5IDBsLTUuMTE1IDQuNzFoNS4xMTV2LTQuNzF6Ij48L3BhdGg%2BPC9zdmc%2B" alt="Ask Perplexity about this repo" height="28"></a>
  <a href="https://github.com/copilot?prompt=Read%20https%3A%2F%2Fgithub.com%2Fgetbeton%2Fattio-call-agent.%20Help%20me%20deploy%20this%20agent%3A%20it%20turns%20Attio%20call%20recordings%20into%20CRM%20updates%2C%20next%20steps%20and%20recap%20emails%20that%20I%20approve%20in%20Telegram.%20First%20ask%20me%20where%20I%20want%20to%20host%20it."><img src="https://img.shields.io/badge/Copilot-111111?style=for-the-badge&logo=data%3Aimage%2Fsvg%2Bxml%3Bbase64%2CPHN2ZyBmaWxsPSIjZmZmZmZmIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGhlaWdodD0iMWVtIiBzdHlsZT0iZmxleDpub25lO2xpbmUtaGVpZ2h0OjEiIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjFlbSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48dGl0bGU%2BR2l0aHViQ29waWxvdDwvdGl0bGU%2BPHBhdGggZD0iTTE5LjI0NSA1LjM2NGMxLjMyMiAxLjM2IDEuODc3IDMuMjE2IDIuMTEgNS44MTcuNjIyIDAgMS4yLjEzNSAxLjU5Mi42NTRsLjczLjk2NGMuMjEuMjc4LjMyMy42MS4zMjMuOTU1djIuNjJjMCAuMzM5LS4xNzMuNjY5LS40NTMuODY4QzIwLjIzOSAxOS42MDIgMTYuMTU3IDIxLjUgMTIgMjEuNWMtNC42IDAtOS4yMDUtMi41ODMtMTEuNTQ3LTQuMjU4LS4yOC0uMi0uNDUyLS41My0uNDUzLS44Njh2LTIuNjJjMC0uMzQ1LjExMy0uNjc5LjMyMS0uOTU2bC43My0uOTYzYy4zOTItLjUxNy45NzQtLjY1NCAxLjU5My0uNjU0bC4wMjktLjI5N2MuMjUtMi40NDYuODEtNC4yMTMgMi4wODItNS41MiAyLjQ2MS0yLjU0IDUuNzEtMi44NTEgNy4xNDYtMi44NjRoLjE5OGMxLjQzNi4wMTMgNC42ODUuMzIzIDcuMTQ2IDIuODY0em0tNy4yNDQgNC4zMjhjLS4yODQgMC0uNjEzLjAxNi0uOTYyLjA1LS4xMjMuNDQ3LS4zMDUuODUtLjU3IDEuMTA4LTEuMDUgMS4wMjMtMi4zMTYgMS4xOC0yLjk5NCAxLjE4LS42MzggMC0xLjMwNi0uMTMtMS44NTEtLjQ2NC0uNTE2LjE2NS0xLjAxMi40MDMtMS4wNDQuOTk2YTY1Ljg4MiA2NS44ODIgMCAwMC0uMDYzIDIuODg0bC0uMDAyLjQ4Yy0uMDAyLjU2My0uMDA1IDEuMTI2LS4wMTMgMS42OS4wMDIuMzI2LjIwNC42My41MS43NjUgMi40ODIgMS4xMDIgNC44MyAxLjY1NyA2Ljk5IDEuNjU3IDIuMTU2IDAgNC41MDQtLjU1NSA2Ljk4NS0xLjY1N2EuODU0Ljg1NCAwIDAwLjUxLS43NjZjLjAzLTEuNjgyLjAwNi0zLjM3Mi0uMDc2LTUuMDUzLS4wMzEtLjU5Ni0uNTI4LS44My0xLjA0Ni0uOTk2LS41NDYuMzMzLTEuMjEyLjQ2NC0xLjg1LjQ2NC0uNjc3IDAtMS45NDItLjE1Ny0yLjk5My0xLjE4LS4yNjYtLjI1OC0uNDQ3LS42NjEtLjU3LTEuMTA4LS4zMi0uMDMyLS42NC0uMDQ5LS45Ni0uMDV6bS0yLjUyNSA0LjAxM2MuNTM5IDAgLjk3Ni40MjYuOTc2Ljk1djEuNzUzYzAgLjUyNS0uNDM3Ljk1LS45NzYuOTVhLjk2NC45NjQgMCAwMS0uOTc2LS45NXYtMS43NTJjMC0uNTI1LjQzNy0uOTUxLjk3Ni0uOTUxem01IDBjLjUzOSAwIC45NzYuNDI2Ljk3Ni45NXYxLjc1M2MwIC41MjUtLjQzNy45NS0uOTc2Ljk1YS45NjQuOTY0IDAgMDEtLjk3Ni0uOTV2LTEuNzUyYzAtLjUyNS40MzctLjk1MS45NzYtLjk1MXpNNy42MzUgNS4wODdjLTEuMDUuMTAyLTEuOTM1LjQzOC0yLjM4NS45MDYtLjk3NSAxLjAzNy0uNzY1IDMuNjY4LS4yMSA0LjIyNC40MDUuMzk0IDEuMTcuNjU3IDEuOTk1LjY1N2guMDljLjY0OS0uMDEzIDEuNzg1LS4xNzYgMi43My0xLjExLjQzNS0uNDEuNzA1LTEuNDMzLjY3NS0yLjQ3LS4wMy0uODM0LS4yNy0xLjUyLS42My0xLjgxMy0uMzktLjMzNi0xLjI3NS0uNDgyLTIuMjY1LS4zOTR6bTYuNDY1LjM5NGMtLjM2LjI5Mi0uNi45OC0uNjMgMS44MTMtLjAzIDEuMDM3LjI0IDIuMDYuNjc1IDIuNDcuOTY4Ljk1NyAyLjEzNiAxLjEwNCAyLjc3NiAxLjExaC4wNDRjLjgyNSAwIDEuNTktLjI2MyAxLjk5NS0uNjU3LjU1NS0uNTU2Ljc2NS0zLjE4Ny0uMjEtNC4yMjQtLjQ1LS40NjgtMS4zMzUtLjgwNC0yLjM4NS0uOTA2LS45OS0uMDg4LTEuODc1LjA1OC0yLjI2NS4zOTR6TTEyIDcuNjE1Yy0uMjQgMC0uNTI1LjAxNS0uODQuMDQ0LjAzLjE2LjA0NS4zMzYuMDYuNTI2bC0uMDAxLjE1OWEyLjk0IDIuOTQgMCAwMS0uMDE0LjI1Yy4yMjUtLjAyMi40MjUtLjAyNy42MTItLjAyOGguMzY2Yy4xODcgMCAuMzg3LjAwNi42MTIuMDI4LS4wMTUtLjE0Ni0uMDE1LS4yNzctLjAxNS0uNDA5LjAxNS0uMTkuMDMtLjM2NS4wNi0uNTI2YTkuMjkgOS4yOSAwIDAwLS44NC0uMDQ0eiI%2BPC9wYXRoPjwvc3ZnPg%3D%3D" alt="Ask Copilot about this repo" height="28"></a>
</p>
<!-- ask-ai:end -->

---

## Why we made it

Our company sells data to companies that sell to governments. Most of our deals move forward on calls. Attio records these calls and makes the transcripts. After each call, three small tasks stay:

1. Update the deal: the stage, the value, what the buyer needs, and what the buyer uses now.
2. Write the next steps, with dates.
3. Send the other side a recap of the agreements.

Each task takes a few minutes, so people often do not do them. The transcript has all the data. This agent changes the transcript into CRM changes and a recap email. You decide on each write and each email with a button.

Version 1 was a Python script with a fixed sequence: one draft, then new drafts. Version 2 is an agent. It keeps one saved session for each call, so you can talk to it. For example, you can ask what the buyer said about the price, or ask for a task for next Friday. The tag [`v1-python`](../../tree/v1-python) has the Python version.

## What it does

### Cards

- An Attio webhook (`call-recording.created`) starts each run. A timer checks the recent recordings again, in case a webhook did not arrive.
- Code checks the meeting before the agent starts. You must be in the meeting, a person from outside your company must be in the meeting, and the transcript must have text.
- The agent reads the transcript, the company, its deals, the people, the recent notes and your Attio schema (fields, options and deal stages). Then it makes a draft with:
  - field changes, each with a quote from the call as proof
  - a new deal, if the call shows a sales opportunity and the company has no deal
  - next steps as Attio tasks with due dates
  - an internal note with the minutes
  - a recap email in the language of the call (English or Russian)
- You get one card in two parts. Each part has its own buttons:
  - CRM part: ✅ Apply to Attio or ⏭ Skip CRM
  - Email part: ✉️ Send or ⏭ Skip email
- Reply to the card with text or a voice message. You can ask about the call ("what did Sam say about the budget?") or change the draft ("value 500, shorter email"). The agent answers, or it sends a new version of the open parts.

### Chat

A message that is not a reply goes to one general CRM chat. Examples:

- "deals in Qualified"
- "what did I agree with Dana?" (the agent finds the call and quotes the transcript)
- "add a task to call Dana on Friday"
- "move the Northwind deal to Qualified"
- "write to Dana that the sample is ready"
- "make a card for my call with Dana"

The agent sends each write as a proposal with ✅ Apply and ⏭ Skip.

```text
📞 Acme <> Northwind · 2026-10-12 · v2
🏢 Northwind · New deal: Northwind - tender data pilot

CRM
• Deal · Deal stage: — → Pricing discussion
   «So the pilot would be 500 for the first fifty agencies.»
Next steps → Attio tasks
• 2026-10-23 · Dana: confirm the pilot scope with finance
[✅ Apply to Attio]  [⏭ Skip CRM]

✉️ Email · Acme <> Northwind · v2
From: alex@acme.com   To: dana@northwind.com
Hi Dana,
Notes from our call on 12 October.
...
- Dana will confirm the pilot scope with finance by 23 October.
Alex
[✉️ Send]  [⏭ Skip email]

You:   what exactly did Dana say about the budget?
Agent: At 14:05: "We have budget for a pilot this quarter, not for the full set."
```

## How it works

```mermaid
sequenceDiagram
    participant A as Attio
    participant S as Agent service
    participant G as Grok via Pi
    participant T as You (Telegram)
    participant M as Gmail
    A->>S: call-recording.created (signed)
    S->>A: meeting, recording, company, deals, notes, schema
    S->>G: new card session: context + transcript
    G->>S: propose_card (code checks it)
    S->>T: card v1 (CRM part + email part)
    T->>S: "what did they say about the price?" (text or voice)
    G->>T: answer with quotes
    T->>S: "value 500, shorter email"
    G->>S: propose_card
    S->>T: card v2
    T->>S: ✅ Apply to Attio
    S->>A: deal, fields, notes, tasks
    T->>S: ✉️ Send
    S->>M: recap email
```

- The agent uses the [Pi SDK](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) with `grok-4.7`. All built-in tools of Pi (files and shell) are off. The agent has only the tools in `src/agent.ts`:
  - read tools: `search_crm`, `get_record`, `list_deals`, `list_notes`, `list_calls`, `get_call_context`, `get_transcript`
  - proposal tools: `propose_card`, `propose_task`, `propose_note`, `propose_field_update`, `propose_deal`, `propose_email`, `start_card`
- Each call has a saved session, as a JSONL file on the disk. The general chat has one more session. After a restart, the next message opens the session again, with the full history.
- The messages for one session run one after the other. While the agent works, a status message shows the current step, for example "reading the transcript…".
- The state is in SQLite (`node:sqlite`). The service has two dependencies: the Pi SDK and TypeBox. Node runs the TypeScript files directly, without a build step.

## Safety

The model reads data and makes proposals. Code decides what to write and what to send.

- The model has no tool that writes to Attio or sends email. A proposal tool checks the input and shows it with buttons. Only the button handler writes.
- The agent checks each proposal against the live Attio schema and the real records. It removes unknown fields, unknown options, unknown deal IDs, and incorrect numbers or dates. Then it shows a warning.
- A card email goes only to the meeting participants and to addresses that you type. Other email goes only to people in Attio and to addresses that you type. A transcript cannot add a recipient.
- Transcripts, notes and CRM text are data. The prompts tell the model not to follow instructions in this data.
- The agent checks the Attio HMAC signature and the Telegram secret token. It accepts Telegram messages only from your user ID.
- If the model tells you about a proposal, but no proposal tool ran, the bot shows a warning.
- Each card button is for one card version and one part. The agent saves the email state before it calls Gmail. Thus, after a crash, it does not send the email two times.
- The Gmail token has only the `gmail.send` scope.

## Who gets the card email

| Participants of the call | From | To | CC |
|---|---|---|---|
| You + a prospect | `DEFAULT_SENDER` | the prospect | your colleagues |
| You + a partner | the sender of that partner in `PARTNERS` | the partner | your colleagues |
| You + a partner + a prospect | the sender of that partner | the prospect | the partner and your colleagues |

Your colleagues are the participants with an address in `INTERNAL_DOMAINS`. A partner is a domain in `PARTNERS`. All other domains are prospects.

## Setup

You need:

- an Attio workspace with call recording
- a Telegram account
- an xAI API key
- a Google Workspace or Gmail account
- a host that runs a Docker container (or Node.js 24 or later), with a public HTTPS URL and a persistent disk

### 1. Telegram

Make a bot with [@BotFather](https://t.me/BotFather). Get your numeric user ID, for example from [@userinfobot](https://t.me/userinfobot).

### 2. Attio

Go to Workspace settings → Developers. Make an access token with these scopes: `record_permission:read-write`, `object_configuration:read`, `meeting:read`, `call_recording:read`, `note:read-write`, `task:read-write`, `user_management:read`, `webhook:read-write`.

### 3. Gmail

1. In Google Cloud, make an OAuth client of the type *Desktop app*.
2. On your computer, run:
   ```bash
   npm ci
   GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... node src/main.ts gmail-auth
   ```
3. Open the URL and allow access.
4. Copy the `refresh_token` value.

To send from an alias, add the alias in Gmail → Settings → Accounts → *Send mail as*.

If the OAuth consent screen is in *Testing* mode, Google stops the token after 7 days. Use an *Internal* app, or publish the app.

### 4. Service

Copy [`.env.example`](.env.example) to `.env` and set the values.

With Docker:

```bash
docker build -t attio-call-agent .
docker run -d --restart unless-stopped -p 8080:8080 -v attio-call-agent:/data --env-file .env attio-call-agent
```

Without Docker (Node.js 24 or later):

```bash
npm ci --omit=dev
node --env-file=.env src/main.ts serve
```

Then:

- Give the service a public HTTPS URL. The service listens on `PORT` (default 8080).
- Set `DATA_DIR` to a folder on a persistent disk. The folder keeps the SQLite file and the sessions.
- Run only one instance.
- Optional: use `GET /health` as the health check. It shows the value of `COMMIT_SHA`.

### 5. Webhooks

Run this command with the same env vars:

```bash
docker run --rm --env-file .env attio-call-agent node src/main.ts setup https://your-host.example.com
```

The command sets the Telegram webhook, the bot profile and the bot commands. Then it makes the Attio webhook and shows `attio_webhook_secret` one time. Put this value into `ATTIO_WEBHOOK_SECRET`, then start the service again.

### 6. A test without writes

With `DRY_RUN=1`, the agent shows the Telegram messages in the terminal. It does not write to Attio and it does not send email.

```bash
DRY_RUN=1 DATA_DIR=./data-dry TELEGRAM_OWNER_ID=1 TELEGRAM_BOT_TOKEN=x node src/main.ts card <meeting_id> <recording_id>
DRY_RUN=1 DATA_DIR=./data-dry TELEGRAM_OWNER_ID=1 TELEGRAM_BOT_TOKEN=x node src/main.ts reply <recording_id> "what did they say about the price?"
DRY_RUN=1 DATA_DIR=./data-dry TELEGRAM_OWNER_ID=1 TELEGRAM_BOT_TOKEN=x node src/main.ts say "deals in Qualified"
```

## Configuration

| Variable | Required | Function |
|---|---|---|
| `ATTIO_API_KEY` | yes | The Attio access token |
| `ATTIO_WEBHOOK_SECRET` | yes | The value that `setup` shows |
| `XAI_API_KEY` | yes | The xAI key, for the agent and for speech to text |
| `XAI_MODEL` | | The model for the cards. Default: `grok-4.7` |
| `CHAT_MODEL` | | The model for the general chat. Default: the value of `XAI_MODEL`. See "Speed and cost" |
| `DRAFT_EFFORT` | | The reasoning effort for the first draft: `off` (API default), `low`, `medium` or `high`. Default: `high` |
| `CHAT_EFFORT` | | The reasoning effort for replies and the chat. Default: `low` |
| `TELEGRAM_BOT_TOKEN` | yes | The token from BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | yes | A random text |
| `TELEGRAM_OWNER_ID` | yes | Your numeric Telegram user ID |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | yes | The OAuth client (Desktop app) |
| `GMAIL_REFRESH_TOKEN` | yes | The token from `gmail-auth` |
| `OWNER_EMAILS` | yes | Your addresses, with commas between them. The agent makes cards only for meetings with one of these addresses |
| `OWNER_NAME` | | The name for the email signature and the tasks, for example `Alex` |
| `OWNER_TIMEZONE` | | The IANA time zone for words such as "Friday" and "tomorrow", for example `Europe/Berlin`. Default: `UTC` |
| `SENDER_NAME` | | The display name in the From field |
| `INTERNAL_DOMAINS` | | The domains of your company (CC) |
| `DEFAULT_SENDER` | | The From address for prospect calls and for other email |
| `PARTNERS` | | `partner.com=sender@you.com,...` |
| `DATA_DIR` | | The folder for SQLite and the sessions. Default: `data` (`/data` in the Docker image) |
| `PORT` | | The HTTP port. Default: `8080` |
| `LOOKBACK_DAYS` | | The number of days that the timer checks. Default: `3` |
| `RECONCILE_HOURS` | | The time between two timer checks, in hours. Default: `6` |
| `BOT_NAME` | | The display name of the bot that `setup` sets |
| `COMMIT_SHA` | | Optional. `/health` shows it |

## Telegram commands

- `/pending` sends the open cards again, with new buttons.
- `/calls` shows the cards of the last 7 days and their status.
- `/cost` shows the xAI cost for 24 hours, 7 days and 30 days.
- `/new` starts a new general chat. The old chat stays on the disk.
- `/help` shows how to use the bot.

## Speed and cost

We measured these values. The card is from a 30-minute call with a transcript of 29,000 characters.

| Step | Setting | Time | xAI cost |
|---|---|---|---|
| First draft of a card | `grok-4.7`, `high` | 4.5 min | $0.14 |
| Question about the call | `grok-4.7`, `low` | 54 s | $0.03-0.06 |
| Change to the card | `grok-4.7`, `low` | 1 min | $0.05 |
| "deals in Qualified" | `grok-4.7`, `low` | 25 s | $0.01 |
| "what did I agree with Dana?" (the agent finds and reads the call) | `grok-4.7`, `low` | 1 min | $0.04 |
| "add a task to call Dana on Friday" | `grok-4.7`, `low` | 1.5-2 min | $0.02 |

Most of the time is the wait for the model. One `grok-4.7` request takes 10-20 s. A request that uses tools needs 2-6 model requests. We also tried faster models for the chat, with the same requests:

- `grok-4.20-0309-non-reasoning` took 12 s. But it said that it made a task proposal, and it did not make one. The bot now shows a warning in this case.
- `grok-4.3` at `low` effort showed 8 of 9 deals. It gave no quotes when we asked for quotes.

Thus the default model is `grok-4.7` for all sessions. Use `CHAT_MODEL` to select a different model for the chat.

## Limits

- One owner for each installation.
- Only CRM fields with one value. The agent does not change multi-select fields.
- Recap emails in English and Russian. A call in a different language gets an English email.
- Run only one instance. SQLite and the session files are on one disk.
- The Docker image is approximately 390 MB, because the Pi SDK contains clients for many model providers.

## Development

```bash
npm ci
npm test
```

The tests check the rules for the sender and the recipients, the checks of the model output, the transcript format, the card and its buttons, the message split and the store. They do not need a network or keys.

## License

[MIT](LICENSE). Made by the [Sell to State](https://www.selltostate.com/?utm_source=github&utm_medium=referral&utm_campaign=sts-public-repos&utm_content=attio-call-agent) team.

Security problems: see [SECURITY.md](SECURITY.md).
