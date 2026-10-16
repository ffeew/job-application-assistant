import type {
  AutofillClickable,
  AutofillField,
  AutofillRequest,
  ModelOutput,
} from "../../../src/app/api/autofill/validators";

// Fixture pages shaped like the application flows the panel's run must get
// through, and a scripted stand-in for the model that answers each one. The
// stand-in's answers still go through finalizeFills, as the route's do.

const page = (body: string) =>
  `<!doctype html><html lang="en"><body>${body}</body></html>`;

/** A Workday-style single-page wizard: repeaters, a toggle, a nested list, a slow Next. */
const workday = page(`
<main id="app">
  <h1>Apply for Platform Engineer</h1>
  <h2>My Experience</h2>
  <section>
    <h3>Work Experience</h3>
    <div id="jobs"></div>
    <button type="button" id="add-job">Add</button>
  </section>
  <section>
    <h3>Languages</h3>
    <div id="languages"></div>
    <button type="button" id="add-language">Add</button>
  </section>
  <button type="button" id="toggle" aria-expanded="false" aria-controls="extra">Additional information</button>
  <div id="extra" hidden><label>Anything else? <textarea id="anything"></textarea></label></div>
  <div>
    <span id="hear-label">How did you hear about us?</span>
    <button type="button" id="hear" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="hear-label" aria-controls="hear-list">Select One</button>
    <ul id="hear-list" role="listbox" hidden></ul>
  </div>
  <button type="button" id="next">Save and Continue</button>
</main>
<script>
  window.nextClicks = 0;
  window.submitted = false;
  const jobs = document.getElementById("jobs");
  const addJob = () => {
    const count = jobs.children.length + 1;
    jobs.insertAdjacentHTML("beforeend", '<div><h4>Work Experience ' + count + '</h4><label>Job Title <input></label><label>Company <input></label></div>');
  };
  addJob();
  document.getElementById("add-job").onclick = addJob;
  document.getElementById("add-language").onclick = () =>
    document.getElementById("languages").insertAdjacentHTML("beforeend", "<label>Language <input></label>");
  const toggle = document.getElementById("toggle");
  toggle.onclick = () => {
    toggle.setAttribute("aria-expanded", "true");
    document.getElementById("extra").hidden = false;
  };
  const hear = document.getElementById("hear");
  const list = document.getElementById("hear-list");
  const levels = { "": ["Job board", "Referral"], "Job board": ["LinkedIn", "Indeed"] };
  const show = (level) => {
    list.replaceChildren(...levels[level].map((text) => {
      const option = document.createElement("li");
      option.setAttribute("role", "option");
      option.textContent = text;
      option.onclick = () => choose(text);
      return option;
    }));
    list.hidden = false;
    hear.setAttribute("aria-expanded", "true");
  };
  const choose = (text) => {
    if (levels[text]) return show(text);
    hear.textContent = text;
    list.hidden = true;
    hear.setAttribute("aria-expanded", "false");
  };
  hear.onclick = () => show("");
  document.getElementById("next").onclick = () => {
    window.nextClicks += 1;
    window.saved = {
      values: Array.from(document.querySelectorAll("input, textarea"), (el) => el.value),
      heard: hear.textContent,
    };
    const app = document.getElementById("app");
    app.insertAdjacentHTML("beforeend", '<div role="progressbar" aria-label="Loading">Loading…</div>');
    setTimeout(() => {
      app.innerHTML = '<h1>Review</h1><p>Check your application before you submit it.</p><button type="button" id="submit">Submit</button><button type="button" id="icon" aria-label=""><svg width="16" height="16"></svg></button>';
      for (const id of ["submit", "icon"]) {
        document.getElementById(id).onclick = () => { window.submitted = true; };
      }
    }, 2000);
  };
</script>`);

/** A careers page with the application embedded from another origin, and a chat widget. */
const greenhouse = (frameOrigin: string) =>
  page(`
<header><nav><button type="button">Next</button></nav></header>
<h1>Careers at Acme</h1>
<label>Newsletter email <input id="newsletter"></label>
<iframe id="form" src="${frameOrigin}/greenhouse-form" title="Application"></iframe>
<iframe id="chat" src="/chat" title="Chat"></iframe>`);

const greenhouseForm = page(`
<form>
  <h2>Apply</h2>
  <label for="first">First name</label><input id="first" required>
  <fieldset><legend>Will you relocate?</legend>
    <label><input type="radio" name="relocate" value="yes"> Yes</label>
    <label><input type="radio" name="relocate" value="no"> No</label>
  </fieldset>
  <div id="follow"></div>
  <button type="submit">Submit application</button>
</form>
<script>
  window.submitted = false;
  document.querySelector("form").addEventListener("submit", (event) => {
    event.preventDefault();
    window.submitted = true;
  });
  // The follow-up arrives after a request, as it would from the server.
  for (const radio of document.querySelectorAll('[name="relocate"]')) {
    radio.addEventListener("change", () => setTimeout(() => {
      if (radio.value === "yes" && !document.getElementById("where")) {
        document.getElementById("follow").innerHTML = '<label for="where">Where to?</label><textarea id="where"></textarea>';
      }
    }, 300));
  }
</script>`);

const chat = page(
  `<label>Message <input id="message"></label><button type="button">Send</button>`,
);

/** A SuccessFactors-style form: a real page load between steps, and a repeater dialog. */
const steps = page(`
<h1>Application</h1>
<form method="get" action="/steps/2">
  <label>Email <input name="email" type="email"></label>
  <details><summary>Education</summary><label>School <input name="school"></label></details>
  <input type="submit" value="Next">
</form>`);

const stepsTwo = page(`
<h1>Certifications</h1>
<ul id="certs"></ul>
<button type="button" id="add">Add certification</button>
<div role="dialog" id="dialog" hidden>
  <h2>New certification</h2>
  <label>Certification <input id="cert"></label>
  <button type="button" id="save">Save</button>
</div>
<form action="/steps/done"><button type="submit">Apply</button></form>
<script>
  const dialog = document.getElementById("dialog");
  const cert = document.getElementById("cert");
  document.getElementById("add").onclick = () => { dialog.hidden = false; };
  document.getElementById("save").onclick = () => {
    const item = document.createElement("li");
    item.textContent = cert.value;
    document.getElementById("certs").append(item);
    cert.value = "";
    dialog.hidden = true;
  };
</script>`);

/** Answers the applicant gave must survive the run. */
const own = page(`
<h1>Your details</h1>
<form>
  <label>Preferred name <input id="preferred"></label>
  <label>Phone <input id="phone"></label>
  <label><input type="checkbox" id="relocation"> Open to relocation</label>
  <label>Verification code <input id="code" required></label>
</form>`);

const fails = page(`
<h1>Contact</h1>
<form>
  <label>Phone <input id="phone" maxlength="3" required></label>
  <button type="button" id="next">Next</button>
</form>
<script>
  window.nextClicks = 0;
  document.getElementById("next").onclick = () => { window.nextClicks += 1; };
</script>`);

const slow = page(`<h1>Slow</h1><label>First name <input id="first"></label>`);

const stuck = page(`
<h1>Stuck</h1>
<label>First name <input id="first" value="Alex"></label>
<button type="button" id="next">Next</button>
<script>
  window.nextClicks = 0;
  document.getElementById("next").onclick = () => { window.nextClicks += 1; };
</script>`);

/** The offered "Next" turns into "Submit" before the click lands. */
const race = page(`
<h1>Race</h1>
<label>First name <input id="first" value="Alex"></label>
<button type="button" id="next">Next</button>
<script>
  window.nextClicks = 0;
  window.submitted = false;
  const next = document.getElementById("next");
  next.onclick = () => {
    if (next.textContent === "Submit") window.submitted = true;
    else window.nextClicks += 1;
  };
  const poll = setInterval(async () => {
    if ((await (await fetch("/race-armed")).text()) !== "yes") return;
    next.textContent = "Submit";
    clearInterval(poll);
  }, 100);
</script>`);

export const agentPages = (frameOrigin: string): Record<string, string> => ({
  "/workday": workday,
  "/greenhouse": greenhouse(frameOrigin),
  "/greenhouse-form": greenhouseForm,
  "/chat": chat,
  "/steps/1": steps,
  "/steps/2": stepsTwo,
  "/own": own,
  "/fails": fails,
  "/slow": slow,
  "/stuck": stuck,
  "/race": race,
});

type Answer = Partial<ModelOutput>;

const fill = (field: AutofillField, value: string, drafted = false) => ({
  fieldId: field.id,
  value,
  drafted,
});
const target = (clickable: AutofillClickable | undefined) =>
  clickable ? { targetId: clickable.id } : null;
const offered = (
  request: AutofillRequest,
  purpose: AutofillClickable["purpose"],
  matches: (clickable: AutofillClickable) => boolean = () => true,
) =>
  request.clickables.find(
    (clickable) => clickable.purpose === purpose && matches(clickable),
  );
const unfilled = (request: AutofillRequest, label: string) =>
  request.fields.find((field) => field.label === label && !field.filled);

const jobs = [
  { title: "Engineer", company: "Acme" },
  { title: "Intern", company: "Beta" },
];

const models: Record<string, (request: AutofillRequest) => Answer> = {
  "/workday": (request) => {
    const fills = request.fields.flatMap((field) => {
      if (field.filled) return [];
      const block = /^Work Experience (\d+)$/.exec(field.section ?? "")?.[1];
      const job = block ? jobs[Number(block) - 1] : undefined;
      if (job && field.label === "Job Title") return [fill(field, job.title)];
      if (job && field.label === "Company") return [fill(field, job.company)];
      if (field.label === "Anything else?")
        return [fill(field, "Happy to relocate.", true)];
      return [];
    });
    const blocks = new Set(
      request.fields
        .map((field) => field.section ?? "")
        .filter((section) => section.startsWith("Work Experience ")),
    ).size;
    const choice = offered(request, "choose_option", (clickable) =>
      ["Job board", "LinkedIn"].includes(clickable.label),
    );
    if (choice) return { click: target(choice) };
    const click =
      (blocks < jobs.length
        ? offered(request, "add_entry", (clickable) =>
            (clickable.section ?? "").startsWith("Work Experience"),
          )
        : undefined) ??
      offered(request, "expand") ??
      (fills.length
        ? undefined
        : (offered(request, "open_list") ?? offered(request, "next")));
    return { fills, click: target(click) };
  },
  "/greenhouse": (request) => {
    const fills = [];
    const first = unfilled(request, "First name");
    if (first) fills.push(fill(first, "Alex"));
    const relocate = unfilled(request, "Will you relocate?");
    if (relocate) fills.push(fill(relocate, "Yes"));
    const where = unfilled(request, "Where to?");
    if (where) fills.push(fill(where, "Lisbon", true));
    return { fills };
  },
  "/steps/1": (request) => {
    const fills = [];
    const email = unfilled(request, "Email");
    if (email) fills.push(fill(email, "alex@example.test"));
    const school = unfilled(request, "School");
    if (school) fills.push(fill(school, "Lisbon University"));
    return {
      fills,
      click: target(offered(request, "expand") ?? offered(request, "next")),
    };
  },
  "/steps/2": (request) => {
    const cert = unfilled(request, "Certification");
    if (cert) {
      return {
        fills: [fill(cert, "AWS Solutions Architect")],
        click: target(offered(request, "save_entry")),
      };
    }
    return request.pageText.includes("AWS Solutions Architect")
      ? {}
      : { click: target(offered(request, "add_entry")) };
  },
  "/own": (request) => {
    const byLabel = (label: string) =>
      request.fields.find((field) => field.label === label);
    const fills = [];
    const preferred = byLabel("Preferred name");
    if (preferred) fills.push(fill(preferred, "Alexander"));
    const phone = unfilled(request, "Phone");
    if (phone) fills.push(fill(phone, "555-0100"));
    const relocation = byLabel("Open to relocation");
    if (relocation) fills.push(fill(relocation, "true"));
    const code = unfilled(request, "Verification code");
    return code
      ? {
          fills,
          unanswered: [{ fieldId: code.id, reason: "Enter the emailed code" }],
          status: "handoff",
          message: "Enter the code we emailed you, then click Continue.",
        }
      : { fills };
  },
  "/fails": (request) => {
    const phone = unfilled(request, "Phone");
    return {
      fills: phone ? [fill(phone, "555-0100")] : [],
      click: target(offered(request, "next")),
    };
  },
  "/slow": (request) => {
    const first = unfilled(request, "First name");
    return { fills: first ? [fill(first, "Alex")] : [] };
  },
  "/stuck": (request) => ({ click: target(offered(request, "next")) }),
  "/race": (request) => ({ click: target(offered(request, "next")) }),
};

/** What the stand-in model answers for a step on the given page. */
export function agentAnswer(request: AutofillRequest): ModelOutput {
  const path = new URL(request.url).pathname;
  return {
    fills: [],
    unanswered: [],
    click: null,
    status: "continue",
    message: "",
    ...models[path]?.(request),
  };
}
