"use strict";

const components = {
  terraform: { label: "TERRAFORM", title: "Инфраструктура хранится в Git", description: "Terraform описывает VPC, подсети, security groups и виртуальные машины. State хранится в закрытом S3 bucket с версионированием и блокировкой." },
  control: { label: "CONTROL PLANE", title: "Одна точка управления", description: "API server, scheduler и etcd управляют кластером. Control plane работает на непрерываемой ВМ; обычные приложения размещаются на workers." },
  worker1: { label: "WORKER 01 · ZONE A", title: "Место для приложения", description: "Прерываемая worker-нода в зоне a. Kubelet и containerd запускают контейнеры, а Flannel обеспечивает связь pod’ов между нодами." },
  worker2: { label: "WORKER 02 · ZONE D", title: "Ещё одна нода, другая зона", description: "Вторая прерываемая worker-нода находится в зоне d. Она позволяет распределить реплики приложения между двумя рабочими машинами." }
};

const steps = {
  commit: { command: "git push", description: "Изменения приложения отправляются в отдельный репозиторий. Коммит становится отправной точкой новой версии." },
  build: { command: "docker build", description: "Dockerfile собирает статическую страницу и nginx в один образ. Версия и Git SHA записываются в version.json при сборке." },
  registry: { command: "docker push ghcr.io/qlore3/diplom_app", description: "Образ публикуется в GitHub Container Registry с тегом версии. По этому адресу Kubernetes сможет получить нужный контейнер." },
  deploy: { command: "kubectl rollout", description: "Следующий этап доставки — обновление Deployment в Kubernetes. Эта схема объясняет маршрут релиза и сама не запускает деплой." },
  verify: { command: "GET /version.json", description: "Версия на этой странице приходит из собранного образа. После обновления достаточно сравнить номер версии и коммит." }
};

function selectButton(button, selector) {
  document.querySelectorAll(selector).forEach(item => {
    const selected = item === button;
    item.classList.toggle(selector === "[data-component]" ? "selected" : "active", selected);
    item.setAttribute("aria-pressed", String(selected));
  });
}

document.querySelectorAll("[data-component]").forEach(button => {
  button.addEventListener("click", () => {
    const component = components[button.dataset.component];
    selectButton(button, "[data-component]");
    document.getElementById("component-label").textContent = component.label;
    document.getElementById("component-title").textContent = component.title;
    document.getElementById("component-description").textContent = component.description;
    document.querySelector(".detail-resource").hidden = button.dataset.component === "terraform";
  });
});

document.querySelectorAll("[data-step]").forEach(button => {
  button.addEventListener("click", () => {
    selectButton(button, "[data-step]");
    document.getElementById("step-command").textContent = steps[button.dataset.step].command;
    document.getElementById("step-description").textContent = steps[button.dataset.step].description;
  });
});

const cat = document.getElementById("dancing-cat");
const catRest = document.getElementById("cat-rest");
const catToggle = document.getElementById("cat-toggle");
function setCatRest(resting) {
  cat.hidden = resting;
  catRest.hidden = !resting;
  catToggle.textContent = resting ? "▷" : "Ⅱ";
  catToggle.setAttribute("aria-pressed", String(resting));
  catToggle.setAttribute("aria-label", resting ? "Вернуть котика на танцпол" : "Отправить котика на перерыв");
}
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
setCatRest(reducedMotion.matches);
reducedMotion.addEventListener("change", event => setCatRest(event.matches));
catToggle.addEventListener("click", () => setCatRest(!cat.hidden));
let applause = 0;
document.getElementById("applause").addEventListener("click", () => {
  applause += 1;
  document.getElementById("applause-count").textContent = String(applause);
});

let version = "dev";
let revision = "local";
async function loadVersion() {
  try {
    const response = await fetch("version.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Version unavailable");
    const info = await response.json();
    if (typeof info.version !== "string" || typeof info.revision !== "string") throw new Error("Invalid version");
    version = info.version;
    revision = info.revision;
    document.querySelectorAll("[data-version]").forEach(item => { item.textContent = version; });
    document.getElementById("commit").textContent = revision.slice(0, 7);
    if (info.built_at && !Number.isNaN(Date.parse(info.built_at))) {
      const date = new Date(info.built_at);
      const time = document.getElementById("built-at");
      time.dateTime = date.toISOString();
      time.textContent = new Intl.DateTimeFormat("ru-RU", { dateStyle: "short", timeStyle: "short", timeZone: "UTC" }).format(date) + " UTC";
    }
  } catch {
    document.getElementById("built-at").textContent = "метаданные недоступны";
  }
}
loadVersion();

document.getElementById("copy-version").addEventListener("click", async () => {
  const text = `${version} · ${revision.slice(0, 7)}`;
  const status = document.getElementById("copy-status");
  if (!navigator.clipboard || !window.isSecureContext) {
    status.textContent = `Версия: ${text}`;
    document.getElementById("copy-version").textContent = text;
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    status.textContent = "Версия скопирована";
    document.getElementById("copy-version").textContent = "Скопировано ✓";
  } catch {
    status.textContent = `Версия: ${text}`;
    document.getElementById("copy-version").textContent = text;
  }
});
