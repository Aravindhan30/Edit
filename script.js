/*
  SENSOR FESTIVAL 2026
  ECE Department • PTLEE CNECET

  IMPORTANT:
  This demo uses browser localStorage for a prototype.
  For a real public event, use a server/database to make sensor
  reservations atomic across all users.

  EMAIL:
  Set FORM_ENDPOINT to your backend endpoint. The endpoint should
  accept JSON: {name, department, sensor, sensorDescription, concepts, projects}
  and send the email server-side.
*/
const FORM_ENDPOINT = ""; // Example: "/api/register" or your deployed server endpoint.

const sensors = [
  {id:"ir", icon:"◉", name:"IR Sensor", tag:"Motion / Obstacle", desc:"Detects nearby objects using infrared light. Ideal for simple presence, obstacle and automation systems.", concepts:"Infrared transmission & reflection, digital sensing, comparator logic, signal interfacing.", projects:["Smart obstacle detector with alert","Automatic contactless door system","IR-based visitor / object counter"]},
  {id:"ultrasonic", icon:"⌁", name:"Ultrasonic Sensor", tag:"Distance", desc:"Measures distance by sending an ultrasonic pulse and timing its echo.", concepts:"Time-of-flight, echo measurement, distance calculation, microcontroller interfacing.", projects:["Smart parking distance indicator","Water-tank level monitor","Ultrasonic blind-spot / proximity alert"]},
  {id:"ldr", icon:"☼", name:"LDR Sensor", tag:"Light", desc:"Changes resistance according to light intensity, making it useful for automatic lighting and light-level monitoring.", concepts:"Photoconductivity, voltage divider, analog sensing, ADC and threshold control.", projects:["Automatic street-light controller","Smart room lighting system","Solar light intensity monitor"]},
  {id:"dht", icon:"≈", name:"Temperature & Humidity", tag:"Environment", desc:"Measures ambient temperature and relative humidity for environmental monitoring and smart control.", concepts:"Temperature sensing, capacitive humidity sensing, digital data communication and calibration.", projects:["Smart classroom climate monitor","Greenhouse environment controller","IoT weather station"]},
  {id:"pir", icon:"◌", name:"PIR Sensor", tag:"Human Motion", desc:"Detects movement by sensing changes in infrared radiation emitted by warm bodies.", concepts:"Pyroelectric effect, Fresnel lens, motion detection and digital triggering.", projects:["Smart room security alert","Automatic corridor lighting","Occupancy-based energy saver"]},
  {id:"gas", icon:"△", name:"Gas Sensor", tag:"Safety", desc:"Detects changes in the concentration of selected gases and can be used for safety monitoring.", concepts:"Gas-sensitive resistance, analog output, threshold detection and alarm systems.", projects:["Gas leakage warning system","Smart kitchen safety monitor","Air-quality alert unit"]}
];

const sensorSelect = document.getElementById("sensor");
const selectedInfo = document.getElementById("selectedInfo");
const selectedName = document.getElementById("selectedName");
const selectedDescription = document.getElementById("selectedDescription");
const selectedConcepts = document.getElementById("selectedConcepts");
const selectedProjects = document.getElementById("selectedProjects");
const availability = document.getElementById("availability");
const form = document.getElementById("registrationForm");
const formMessage = document.getElementById("formMessage");

function getReserved(){
  try { return JSON.parse(localStorage.getItem("sensorFestivalReserved") || "[]"); }
  catch(e){ return []; }
}
function setReserved(arr){ localStorage.setItem("sensorFestivalReserved", JSON.stringify(arr)); }

function render(){
  const reserved = getReserved();
  sensorSelect.innerHTML = '<option value="">Select an available sensor</option>';
  sensors.forEach(s=>{
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = reserved.includes(s.id) ? `${s.name} — Already selected` : s.name;
    opt.disabled = reserved.includes(s.id);
    sensorSelect.appendChild(opt);
  });
  const open = sensors.filter(s=>!reserved.includes(s.id)).length;
  availability.textContent = `${open} / ${sensors.length} tracks available`;
  availability.style.color = open ? "var(--accent)" : "var(--danger)";
}

function showSensor(){
  const s = sensors.find(x=>x.id===sensorSelect.value);
  if(!s){ selectedInfo.classList.add("hidden"); return; }
  selectedInfo.classList.remove("hidden");
  selectedName.textContent = s.name;
  selectedDescription.textContent = s.desc;
  selectedConcepts.textContent = s.concepts;
  selectedProjects.innerHTML = s.projects.map(p=>`<li>${p}</li>`).join("");
}

document.getElementById("sensorCards").innerHTML = sensors.map(s=>`
  <article class="sensor-card">
    <div class="sensor-icon">${s.icon}</div>
    <h3>${s.name}</h3>
    <p>${s.desc}</p>
    <span class="tag">${s.tag}</span>
  </article>
`).join("");

sensorSelect.addEventListener("change", showSensor);

form.addEventListener("submit", async (e)=>{
  e.preventDefault();
  formMessage.textContent = "";
  const sensor = sensors.find(x=>x.id===sensorSelect.value);
  if(!sensor){ formMessage.textContent="Please select an available sensor."; return; }

  const data = {
    name: document.getElementById("name").value.trim(),
    department: document.getElementById("department").value,
    sensor: sensor.name,
    sensorDescription: sensor.desc,
    concepts: sensor.concepts,
    projects: sensor.projects
  };

  // Reserve locally for prototype use.
  const reserved = getReserved();
  if(reserved.includes(sensor.id)){ render(); showSensor(); formMessage.textContent="That sensor has already been selected."; return; }
  reserved.push(sensor.id); setReserved(reserved);

  const button = form.querySelector(".submit-btn");
  button.disabled = true;
  button.textContent = "Submitting…";

  try{
    if(FORM_ENDPOINT){
      const response = await fetch(FORM_ENDPOINT, {
        method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data)
      });
      if(!response.ok) throw new Error("Submission failed");
      formMessage.textContent = "Registration submitted successfully. Details have been sent.";
    }else{
      formMessage.textContent = "Registration saved on this browser. Add your backend endpoint in script.js to send it by email.";
    }
    form.reset();
    selectedInfo.classList.add("hidden");
    render();
  }catch(err){
    // Roll back local reservation if server submission failed.
    setReserved(getReserved().filter(id=>id!==sensor.id));
    formMessage.textContent = "Could not submit right now. Please try again.";
  }finally{
    button.disabled = false;
    button.textContent = "Submit Registration →";
  }
});

render();
