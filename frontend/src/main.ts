import "./styles.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root element not found");
}

app.innerHTML = `
  <main class="container">
    <h1>Macro News</h1>
    <p>Frontend app initialized.</p>
  </main>
`;

