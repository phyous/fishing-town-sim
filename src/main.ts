import './style.css'

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

const MIN_YEAR = -500
const MAX_YEAR = 1990

type StateKey =
  | 'year'
  | 'population'
  | 'fishStock'
  | 'storminess'
  | 'seaLevel'
  | 'tourism'
  | 'industry'

type SimulationState = Record<StateKey, number>

type BoatType =
  | 'dugout'
  | 'galley'
  | 'cog'
  | 'caravel'
  | 'sail'
  | 'lugger'
  | 'schooner'
  | 'steamer'
  | 'trawler'
  | 'factory'
  | 'container'
  | 'ferry'
  | 'yacht'

type Era = {
  from: number
  name: string
  tag: string
  details: string
  notes: string[]
}

type SliderDefinition = {
  key: StateKey
  label: string
  min: number
  max: number
  step: number
  suffix: string
  hint: string
}

type BuildingDefinition = {
  name: string
  year: number
  x: number
  z: number
  w: number
  d: number
  h: number
  color: string
  roof: string
  rotation?: number
  kind?:
    | 'hut'
    | 'cottage'
    | 'chapel'
    | 'temple'
    | 'fort'
    | 'industrial'
    | 'market'
    | 'hotel'
    | 'research'
    | 'warehouse'
    | 'apartment'
    | 'office'
    | 'highrise'
    | 'port'
  condition?: (state: SimulationState) => boolean
}

const state: SimulationState = {
  year: -500,
  population: 46,
  fishStock: 72,
  storminess: 28,
  seaLevel: 20,
  tourism: 18,
  industry: 28,
}

const eras: Era[] = [
  {
    from: -500,
    name: 'Ancient Fishery Harbor',
    tag: 'oar, sail, amphorae',
    details:
      'A Mediterranean-style fishing cove with reed huts, stone fish tanks, drying racks, amphora storage, oared craft, and small sail boats.',
    notes: ['fish-sauce vats', 'reed huts', 'oared skiffs', 'amphora sheds'],
  },
  {
    from: 200,
    name: 'Late Antique Port',
    tag: 'stone quay village',
    details:
      'The cove gains a compact stone quay, watch tower, market court, larger nets, and coastal traders that move salted fish.',
    notes: ['watch tower', 'stone quay', 'net courtyards', 'coastal galleys'],
  },
  {
    from: 900,
    name: 'Medieval Herring Town',
    tag: 'cogs and fish market',
    details:
      'A walled fishing town grows around a church, guild hall, timber wharves, fish market, and cog-style cargo boats.',
    notes: ['market square', 'guild hall', 'cog boats', 'sea wall'],
  },
  {
    from: 1450,
    name: 'Age of Sail Port',
    tag: 'caravels and salt cod',
    details:
      'Long-distance fisheries add salt houses, rope walks, customs buildings, luggers, caravels, and a fortified harbor mouth.',
    notes: ['rope walk', 'salt houses', 'customs house', 'caravels'],
  },
  {
    from: 1750,
    name: 'Mercantile Fishing Town',
    tag: 'schooners and warehouses',
    details:
      'Warehouses, lighthouses, auction halls, sail lofts, and schooner fleets turn the fishing village into a regional port.',
    notes: ['lighthouse beam', 'sail lofts', 'warehouses', 'schooners'],
  },
  {
    from: 1880,
    name: 'Steam Cannery Port',
    tag: 'rail, smoke, ice',
    details:
      'Steam trawlers, rail connections, canneries, ice factories, cranes, and breakwaters create an industrial waterfront.',
    notes: ['steam trawlers', 'cannery stack', 'rail spur', 'ice factory'],
  },
  {
    from: 1930,
    name: 'Diesel Industrial Harbor',
    tag: 'radar and factory trawlers',
    details:
      'Diesel fleets, cold storage, fuel depots, fishmeal plants, radar masts, trucks, and concrete docks push the port into high throughput.',
    notes: ['diesel trawlers', 'cold storage', 'fuel depot', 'concrete docks'],
  },
  {
    from: 1965,
    name: 'Modern Port Metropolis',
    tag: 'container edge city',
    details:
      'By the late 20th century, the historic fishing core is surrounded by apartment blocks, offices, hotels, a marina, container cranes, ferries, and factory ships.',
    notes: ['container cranes', 'metro skyline', 'factory ships', 'marina'],
  },
]

const sliderDefinitions: SliderDefinition[] = [
  {
    key: 'year',
    label: 'Year',
    min: MIN_YEAR,
    max: MAX_YEAR,
    step: 1,
    suffix: '',
    hint: 'Scrub from 500 BC to 1990; early centuries advance faster during playback.',
  },
  {
    key: 'population',
    label: 'Population pressure',
    min: 20,
    max: 130,
    step: 1,
    suffix: '%',
    hint: 'Controls cottage density, harbor demand, and fleet size.',
  },
  {
    key: 'fishStock',
    label: 'Fish stock',
    min: 5,
    max: 100,
    step: 1,
    suffix: '%',
    hint: 'Changes catch, prosperity, visible fish activity, and conservation pressure.',
  },
  {
    key: 'storminess',
    label: 'Storminess',
    min: 0,
    max: 100,
    step: 1,
    suffix: '%',
    hint: 'Builds darker skies, bigger waves, rain, and higher risk.',
  },
  {
    key: 'seaLevel',
    label: 'Sea level stress',
    min: 0,
    max: 100,
    step: 1,
    suffix: '%',
    hint: 'Raises the harbor, floats boats higher, and triggers defenses.',
  },
  {
    key: 'tourism',
    label: 'Tourism economy',
    min: 0,
    max: 100,
    step: 1,
    suffix: '%',
    hint: 'Adds marina slips, inns, market stalls, and leisure boats.',
  },
  {
    key: 'industry',
    label: 'Fishing industry',
    min: 0,
    max: 100,
    step: 1,
    suffix: '%',
    hint: 'Adds cannery scale, fuel/ice infrastructure, and working vessels.',
  },
]

const buildingDefinitions: BuildingDefinition[] = [
  {
    name: 'Reed fisher hut',
    year: -500,
    x: -18,
    z: 6.5,
    w: 2.5,
    d: 2.2,
    h: 1.45,
    color: '#b99561',
    roof: '#8a6a39',
    rotation: -0.2,
    kind: 'hut',
  },
  {
    name: 'Amphora shed',
    year: -480,
    x: -11,
    z: 4,
    w: 3.6,
    d: 2.4,
    h: 1.8,
    color: '#c99358',
    roof: '#6b4423',
    rotation: 0.15,
    kind: 'warehouse',
  },
  {
    name: 'Fish sauce vats',
    year: -460,
    x: -3.8,
    z: 4.6,
    w: 4,
    d: 2.2,
    h: 1.35,
    color: '#b87945',
    roof: '#7c4a2d',
    rotation: 0.06,
    kind: 'industrial',
  },
  {
    name: 'Coastal shrine',
    year: -420,
    x: 7,
    z: 9,
    w: 2.9,
    d: 3.6,
    h: 2.5,
    color: '#ddd0b5',
    roof: '#a16207',
    rotation: 0.05,
    kind: 'temple',
  },
  {
    name: 'Watch tower',
    year: 200,
    x: 17,
    z: 6.5,
    w: 2.6,
    d: 2.6,
    h: 5.2,
    color: '#9a8f7f',
    roof: '#5b4636',
    rotation: -0.08,
    kind: 'fort',
  },
  {
    name: 'Stone fish market',
    year: 420,
    x: -1.5,
    z: 10.2,
    w: 5.2,
    d: 3.2,
    h: 2.4,
    color: '#c7b89a',
    roof: '#7f5539',
    rotation: -0.05,
    kind: 'market',
  },
  {
    name: 'Guild hall',
    year: 1040,
    x: 9.8,
    z: 11,
    w: 5.5,
    d: 3.8,
    h: 3.8,
    color: '#b98b63',
    roof: '#334155',
    rotation: -0.1,
    kind: 'market',
  },
  {
    name: 'Harbor wall gate',
    year: 1180,
    x: -24,
    z: 1,
    w: 4.3,
    d: 3.2,
    h: 4.8,
    color: '#81796c',
    roof: '#3f3f46',
    rotation: 0.12,
    kind: 'fort',
  },
  {
    name: 'Rope walk',
    year: 1480,
    x: 19,
    z: 2.3,
    w: 10.5,
    d: 1.5,
    h: 1.7,
    color: '#a17c55',
    roof: '#5f3d2e',
    rotation: -0.12,
    kind: 'warehouse',
  },
  {
    name: 'Customs fort',
    year: 1600,
    x: 26,
    z: -1.3,
    w: 5.4,
    d: 4.8,
    h: 4.3,
    color: '#8a8174',
    roof: '#52525b',
    rotation: 0.22,
    kind: 'fort',
  },
  {
    name: 'Harbor master cottage',
    year: 1740,
    x: -16,
    z: 7,
    w: 3.5,
    d: 2.8,
    h: 2.3,
    color: '#b9794f',
    roof: '#563627',
    rotation: -0.18,
    kind: 'cottage',
  },
  {
    name: 'Salt fish shed',
    year: 1740,
    x: -9,
    z: 3.5,
    w: 4.4,
    d: 2.6,
    h: 1.9,
    color: '#9d7651',
    roof: '#3e3028',
    rotation: 0.16,
    kind: 'industrial',
  },
  {
    name: 'Net loft',
    year: 1755,
    x: -3,
    z: 5.3,
    w: 3.6,
    d: 2.5,
    h: 2.1,
    color: '#c49b6b',
    roof: '#6d4934',
    rotation: 0.05,
    kind: 'cottage',
  },
  {
    name: 'Chapel',
    year: 1768,
    x: 5.5,
    z: 10,
    w: 3.2,
    d: 5.2,
    h: 3.1,
    color: '#e0d3bb',
    roof: '#4b5460',
    rotation: 0.07,
    kind: 'chapel',
  },
  {
    name: 'Customs house',
    year: 1810,
    x: 12,
    z: 5.8,
    w: 4.4,
    d: 3.2,
    h: 2.8,
    color: '#d2b48c',
    roof: '#41546b',
    rotation: -0.12,
    kind: 'cottage',
  },
  {
    name: 'Stone warehouse',
    year: 1845,
    x: -12,
    z: -0.2,
    w: 5.8,
    d: 3.2,
    h: 3.1,
    color: '#8a8d86',
    roof: '#334155',
    rotation: 0.12,
    kind: 'industrial',
  },
  {
    name: 'Steam cannery',
    year: 1880,
    x: 2.5,
    z: 0.5,
    w: 7,
    d: 4.2,
    h: 3.6,
    color: '#8f6d55',
    roof: '#6f1d1b',
    rotation: 0,
    kind: 'industrial',
    condition: (sim) => sim.industry > 20,
  },
  {
    name: 'Rail shed',
    year: 1898,
    x: 12,
    z: 0.3,
    w: 8.5,
    d: 3,
    h: 2.8,
    color: '#5f6c72',
    roof: '#263238',
    rotation: -0.04,
    kind: 'industrial',
    condition: (sim) => sim.industry > 35,
  },
  {
    name: 'Ice plant',
    year: 1920,
    x: -20,
    z: 1.5,
    w: 5.4,
    d: 3.7,
    h: 3.2,
    color: '#a7c7d9',
    roof: '#2f4f5f',
    rotation: 0.06,
    kind: 'industrial',
    condition: (sim) => sim.industry > 42,
  },
  {
    name: 'Fish auction hall',
    year: 1955,
    x: 7.8,
    z: -3.4,
    w: 7.6,
    d: 4.8,
    h: 3.5,
    color: '#c4beb1',
    roof: '#45515f',
    rotation: 0,
    kind: 'industrial',
    condition: (sim) => sim.industry > 45,
  },
  {
    name: 'Seafood market',
    year: 1988,
    x: -2.5,
    z: 10.7,
    w: 5.4,
    d: 3.2,
    h: 2.8,
    color: '#df8d5f',
    roof: '#2f6f73',
    rotation: -0.08,
    kind: 'market',
    condition: (sim) => sim.tourism > 18,
  },
  {
    name: 'Harbor inn',
    year: 1975,
    x: 16.5,
    z: 10,
    w: 6,
    d: 4.2,
    h: 5.8,
    color: '#f0d5a5',
    roof: '#9a3412',
    rotation: -0.18,
    kind: 'hotel',
    condition: (sim) => sim.tourism > 35,
  },
  {
    name: 'Marine lab',
    year: 1984,
    x: -18,
    z: 11.5,
    w: 5.4,
    d: 3.8,
    h: 3.2,
    color: '#d9f5f4',
    roof: '#0f766e',
    rotation: 0.18,
    kind: 'research',
    condition: (sim) => sim.fishStock < 55 || sim.industry > 45,
  },
]

const cottageSites = [
  [-23, 7.3, -0.24],
  [-20, 12.5, 0.22],
  [-13, 12.3, -0.1],
  [-7, 11.5, 0.18],
  [-1, 14.1, -0.25],
  [7.3, 15.1, 0.14],
  [13.5, 14.7, -0.16],
  [21, 9.4, 0.24],
  [23.5, 3.5, -0.06],
  [-25.5, 13.9, 0.08],
  [4, 18.4, -0.18],
  [18.8, 17.8, 0.1],
] as const

const coastlinePoints = [
  [-70, -2],
  [-52, -1],
  [-44, -8],
  [-36, -10],
  [-27, -5],
  [-20, -1.5],
  [-14, -1],
  [-9, -7],
  [-4, -13],
  [5, -12],
  [13, -5],
  [22, 2],
  [33, 2],
  [50, 15],
  [70, 17],
] as const

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Expected #app element to exist.')
}

app.innerHTML = `
  <main class="shell">
    <section class="intro-panel">
      <div>
        <p class="eyebrow">Temporal 3D harbor simulator</p>
        <h1>Fishing town to port metropolis.</h1>
        <p class="lede">
          Scrub from an ancient fishing cove to a 1990 industrial port city with
          historically grounded boats, buildings, harbor works, weather, and growth.
        </p>
      </div>
      <div class="status-stack">
        <div>
          <span>Era</span>
          <strong id="era-name">—</strong>
        </div>
        <div>
          <span>Risk</span>
          <strong id="risk-readout">—</strong>
        </div>
      </div>
    </section>

    <section class="simulation-grid">
      <div class="viewport-card">
        <canvas id="town-canvas" aria-label="3D fishing town simulation"></canvas>
        <div class="scene-vignette" aria-hidden="true"></div>
        <div class="timeline-chip">
          <span id="year-readout">1885</span>
          <small id="era-tag">working harbor</small>
        </div>
        <button class="play-button" id="play-button" type="button" aria-pressed="false">
          ▶ Play
        </button>
      </div>

      <aside class="control-panel" aria-label="Simulation controls">
        <div class="panel-heading">
          <p class="eyebrow">Simulation controls</p>
          <h2>Change the town variables</h2>
        </div>
        <div class="controls">
          ${sliderDefinitions
            .map(
              (definition) => `
                <label class="control-row" for="slider-${definition.key}">
                  <span>
                    <strong>${definition.label}</strong>
                    <em>${definition.hint}</em>
                  </span>
                  <output id="value-${definition.key}"></output>
                  <input
                    id="slider-${definition.key}"
                    type="range"
                    min="${definition.min}"
                    max="${definition.max}"
                    step="${definition.step}"
                    value="${state[definition.key]}"
                  />
                </label>
              `,
            )
            .join('')}
        </div>

        <div class="metrics">
          <div>
            <span>Fleet</span>
            <strong id="fleet-readout">—</strong>
          </div>
          <div>
            <span>Annual catch</span>
            <strong id="catch-readout">—</strong>
          </div>
          <div>
            <span>Harbor build-out</span>
            <strong id="buildout-readout">—</strong>
          </div>
        </div>

        <article class="era-card">
          <h3 id="era-card-title">—</h3>
          <p id="era-details">—</p>
          <ul id="era-notes"></ul>
        </article>
      </aside>
    </section>
  </main>
`

const canvas = requiredElement<HTMLCanvasElement>('#town-canvas')
const viewport = requiredElement<HTMLElement>('.viewport-card')
const playButton = requiredElement<HTMLButtonElement>('#play-button')
const yearReadout = requiredElement<HTMLElement>('#year-readout')
const eraTag = requiredElement<HTMLElement>('#era-tag')
const eraName = requiredElement<HTMLElement>('#era-name')
const riskReadout = requiredElement<HTMLElement>('#risk-readout')
const fleetReadout = requiredElement<HTMLElement>('#fleet-readout')
const catchReadout = requiredElement<HTMLElement>('#catch-readout')
const buildoutReadout = requiredElement<HTMLElement>('#buildout-readout')
const eraCardTitle = requiredElement<HTMLElement>('#era-card-title')
const eraDetails = requiredElement<HTMLElement>('#era-details')
const eraNotes = requiredElement<HTMLElement>('#era-notes')

const sliderInputs = new Map<StateKey, HTMLInputElement>()
const valueOutputs = new Map<StateKey, HTMLOutputElement>()

for (const definition of sliderDefinitions) {
  const input = document.querySelector<HTMLInputElement>(`#slider-${definition.key}`)
  const output = document.querySelector<HTMLOutputElement>(`#value-${definition.key}`)

  if (!input || !output) {
    throw new Error(`Missing slider UI for ${definition.key}.`)
  }

  sliderInputs.set(definition.key, input)
  valueOutputs.set(definition.key, output)
}

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: 'high-performance',
})
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.03
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const scene = new THREE.Scene()
const skyColor = new THREE.Color('#8cc9e8')
scene.background = skyColor
scene.fog = new THREE.Fog(skyColor.clone(), 48, 135)

const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 400)
camera.position.set(45, 30, 47)

const composer = new EffectComposer(renderer)
const renderPass = new RenderPass(scene, camera)
const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.24, 0.52, 0.76)
composer.addPass(renderPass)
composer.addPass(bloomPass)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.dampingFactor = 0.06
controls.minDistance = 25
controls.maxDistance = 118
controls.maxPolarAngle = Math.PI * 0.47
controls.target.set(3, 2.2, 3)

const hemiLight = new THREE.HemisphereLight('#dff7ff', '#3e2d22', 1.45)
const sunLight = new THREE.DirectionalLight('#ffe2aa', 3.1)
sunLight.position.set(-30, 42, 24)
sunLight.castShadow = true
sunLight.shadow.mapSize.set(2048, 2048)
sunLight.shadow.camera.left = -55
sunLight.shadow.camera.right = 55
sunLight.shadow.camera.top = 55
sunLight.shadow.camera.bottom = -55
sunLight.shadow.camera.near = 1
sunLight.shadow.camera.far = 130

const fillLight = new THREE.DirectionalLight('#9dc9ff', 0.85)
fillLight.position.set(25, 20, -28)

scene.add(hemiLight, sunLight, fillLight)

const terrainGroup = new THREE.Group()
const harborGroup = new THREE.Group()
const townGroup = new THREE.Group()
const boatGroup = new THREE.Group()
const atmosphereGroup = new THREE.Group()
scene.add(terrainGroup, harborGroup, townGroup, boatGroup, atmosphereGroup)

const lighthouseBeams: THREE.Object3D[] = []
const windTurbines: THREE.Object3D[] = []
const smokePuffs: THREE.Mesh[] = []
const animatedBoats: THREE.Group[] = []
const movingVehicles: THREE.Group[] = []
const gulls: THREE.Group[] = []
let rainLines: THREE.LineSegments | null = null

const oceanGeometry = createOceanGeometry()
const oceanPosition = oceanGeometry.getAttribute('position') as THREE.BufferAttribute
const oceanBasePositions = Float32Array.from(oceanPosition.array as ArrayLike<number>)
const oceanMaterial = new THREE.MeshPhysicalMaterial({
  color: '#0f7fa4',
  roughness: 0.18,
  metalness: 0.02,
  clearcoat: 0.82,
  clearcoatRoughness: 0.16,
  transmission: 0.03,
  transparent: true,
  opacity: 0.9,
})
const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial)
ocean.receiveShadow = true
terrainGroup.add(ocean)

const fishGlints = createFishGlints()
terrainGroup.add(fishGlints)

buildStaticTerrain()

let isPlaying = false
let continuousYear = state.year
let lastSignature = ''
let frame = 0

for (const definition of sliderDefinitions) {
  const input = sliderInputs.get(definition.key)!
  input.addEventListener('input', () => {
    state[definition.key] = Number(input.value)
    if (definition.key === 'year') {
      continuousYear = state.year
    }

    applySimulation()
  })
}

playButton.addEventListener('click', () => {
  isPlaying = !isPlaying
  playButton.setAttribute('aria-pressed', String(isPlaying))
  playButton.textContent = isPlaying ? '⏸ Pause' : '▶ Play'
})

window.addEventListener('resize', resizeRenderer)

resizeRenderer()
applySimulation()

const clock = new THREE.Clock()
renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.04)
  const elapsed = clock.elapsedTime

  if (isPlaying) {
    continuousYear += delta * getYearSpeed(continuousYear)
    if (continuousYear > MAX_YEAR) {
      continuousYear = MIN_YEAR
    }

    const nextYear = Math.round(continuousYear)
    if (nextYear !== state.year) {
      state.year = nextYear
      applySimulation()
    }
  }

  animateOcean(elapsed)
  animateBoats(elapsed)
  animateCity(elapsed)
  animateAtmosphere(elapsed, delta)
  controls.update()
  composer.render()
})

function resizeRenderer() {
  const rect = viewport.getBoundingClientRect()
  const width = Math.max(1, Math.floor(rect.width))
  const height = Math.max(1, Math.floor(rect.height))
  renderer.setSize(width, height, false)
  composer.setSize(width, height)
  bloomPass.setSize(width, height)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}

function applySimulation() {
  state.year = clamp(Math.round(state.year), MIN_YEAR, MAX_YEAR)
  const signature = sliderDefinitions.map((definition) => state[definition.key]).join('|')

  syncUi()

  if (signature === lastSignature) {
    return
  }

  lastSignature = signature
  rebuildHarbor()
  rebuildTown()
  rebuildBoats()
  rebuildAtmosphere()
  updateLighting()
}

function syncUi() {
  const era = getEra(state.year)
  const metrics = calculateMetrics()

  for (const definition of sliderDefinitions) {
    const input = sliderInputs.get(definition.key)!
    const output = valueOutputs.get(definition.key)!
    input.value = String(state[definition.key])
    output.value = formatValue(definition, state[definition.key])
  }

  yearReadout.textContent = formatYear(state.year)
  eraTag.textContent = era.tag
  eraName.textContent = era.name
  riskReadout.textContent = `${metrics.risk}%`
  fleetReadout.textContent = `${metrics.fleet} vessels`
  catchReadout.textContent = `${metrics.catchIndex} kt`
  buildoutReadout.textContent = `${metrics.buildout}%`
  eraCardTitle.textContent = era.name
  eraDetails.textContent = era.details
  eraNotes.innerHTML = era.notes.map((note) => `<li>${note}</li>`).join('')
}

function formatValue(definition: SliderDefinition, value: number) {
  if (definition.key === 'year') {
    return formatYear(value)
  }

  return `${Math.round(value)}${definition.suffix}`
}

function formatYear(value: number) {
  const rounded = Math.round(value)
  return rounded < 0 ? `${Math.abs(rounded)} BC` : `${rounded}`
}

function getEra(year: number) {
  return [...eras].reverse().find((era) => year >= era.from) ?? eras[0]
}

function calculateMetrics() {
  const urbanization = smoothstep(state.year, 900, 1990)
  const mechanization = smoothstep(state.year, 1840, 1970)
  const containerAge = smoothstep(state.year, 1960, 1990)
  const fleet = clamp(
    Math.round(
      1 +
        state.population * 0.07 +
        state.industry * 0.115 +
        state.fishStock * 0.045 +
        state.tourism * 0.035 +
        urbanization * 9 +
        mechanization * 8 +
        containerAge * 6,
    ),
    2,
    46,
  )
  const stormPenalty = 1 - state.storminess * 0.0045
  const stockPenalty = 0.55 + state.fishStock / 180
  const catchIndex = clamp(
    Math.round(fleet * (0.22 + urbanization * 0.2 + mechanization * 0.92) * stormPenalty * stockPenalty),
    1,
    86,
  )
  const risk = clamp(
    Math.round(state.seaLevel * 0.48 + state.storminess * 0.42 + Math.max(0, 48 - state.fishStock) * 0.26),
    0,
    100,
  )
  const buildout = clamp(
    Math.round(
      smoothstep(state.year, MIN_YEAR, MAX_YEAR) * 38 +
        urbanization * 28 +
        mechanization * 20 +
        containerAge * 16 +
        state.population * 0.18 +
        state.industry * 0.18 +
        state.tourism * 0.08,
    ),
    4,
    100,
  )

  return { buildout, catchIndex, fleet, risk }
}

function createOceanGeometry() {
  const vertices: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const minX = -82
  const maxX = 82
  const minZ = -68
  const maxZ = 18
  const step = 2.1

  for (let x = minX; x < maxX; x += step) {
    for (let z = minZ; z < maxZ; z += step) {
      const cx = x + step / 2
      const cz = z + step / 2
      if (!isWaterPoint(cx, cz)) {
        continue
      }

      const corners = [
        [x, 0, z],
        [x + step, 0, z],
        [x + step, 0, z + step],
        [x, 0, z],
        [x + step, 0, z + step],
        [x, 0, z + step],
      ]

      for (const [vx, vy, vz] of corners) {
        vertices.push(vx, vy, vz)
        normals.push(0, 1, 0)
        uvs.push((vx - minX) / (maxX - minX), (vz - minZ) / (maxZ - minZ))
      }
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  return geometry
}

function isWaterPoint(x: number, z: number) {
  return z < shorelineZ(x) - 0.35
}

function shorelineZ(x: number) {
  for (let i = 0; i < coastlinePoints.length - 1; i += 1) {
    const [x1, z1] = coastlinePoints[i]
    const [x2, z2] = coastlinePoints[i + 1]
    if (x >= x1 && x <= x2) {
      const t = (x - x1) / (x2 - x1)
      return THREE.MathUtils.lerp(z1, z2, t)
    }
  }

  return x < coastlinePoints[0][0] ? coastlinePoints[0][1] : coastlinePoints[coastlinePoints.length - 1][1]
}

function buildStaticTerrain() {
  const landShape = new THREE.Shape()
  moveShapeTo(landShape, -52, 28)
  lineShapeTo(landShape, -52, -1)
  bezierShapeTo(landShape, -44, -8, -36, -10, -27, -5)
  bezierShapeTo(landShape, -20, -1.5, -14, -1, -9, -7)
  bezierShapeTo(landShape, -4, -13, 5, -12, 13, -5)
  bezierShapeTo(landShape, 22, 2, 33, 2, 50, 15)
  lineShapeTo(landShape, 54, 30)
  lineShapeTo(landShape, -52, 28)

  const landGeometry = new THREE.ShapeGeometry(landShape, 18)
  landGeometry.rotateX(-Math.PI / 2)
  const land = new THREE.Mesh(
    landGeometry,
    new THREE.MeshStandardMaterial({
      color: '#6f8d52',
      roughness: 0.92,
      metalness: 0,
    }),
  )
  land.position.y = 0.08
  land.receiveShadow = true
  terrainGroup.add(land)

  const beach = new THREE.Mesh(
    new THREE.RingGeometry(15, 25, 96, 1, 0.18, Math.PI * 0.74),
    new THREE.MeshStandardMaterial({
      color: '#d9c08a',
      roughness: 0.86,
      side: THREE.DoubleSide,
    }),
  )
  beach.rotation.x = -Math.PI / 2
  beach.rotation.z = 0.11
  beach.position.set(-0.5, 0.105, -5.5)
  beach.scale.set(1.45, 0.58, 1)
  terrainGroup.add(beach)

  addHill(-34, 21, 10, 4.2, '#4f713f')
  addHill(-23, 24, 7, 2.8, '#5a7b46')
  addHill(31, 24, 11, 4.7, '#557844')
  addHill(42, 18, 7, 3.1, '#466a39')

  const treeSites = [
    [-38, 13, 1.2],
    [-34, 16, 0.9],
    [-29, 19, 1.1],
    [-21, 20, 0.8],
    [-13, 19, 0.85],
    [10, 22, 1],
    [15, 18, 0.8],
    [23, 19, 1.15],
    [29, 14, 0.9],
    [36, 18, 1.2],
    [41, 13, 0.75],
    [-45, 8, 0.8],
  ] as const

  for (const [x, z, scale] of treeSites) {
    terrainGroup.add(createTree(x, z, scale))
  }
}

function rebuildHarbor() {
  clearGroup(harborGroup)
  windTurbines.length = 0

  const oceanLevel = getOceanLevel()
  addShorelineFoam(oceanLevel)

  const pierLength = clamp(7 + smoothstep(state.year, MIN_YEAR, MAX_YEAR) * 26 + state.industry * 0.08, 7, 35)
  harborGroup.add(createPier(-8, -6.8, pierLength, state.year < 900 ? 1.15 : 2.1, -0.08, state.year < 200 ? '#9b7651' : '#8b6444'))

  if (state.year >= 200) {
    addQuay(-11, -2.7, 12 + smoothstep(state.year, 200, 1450) * 8, 2.25, 0.03, '#8c908a')
  }

  if (state.year >= 900) {
    harborGroup.add(createPier(4.5, -7.2, pierLength * 0.72, 1.7, 0.13, '#7a6045'))
    addQuay(8, -2.7, 15 + smoothstep(state.year, 900, 1880) * 9, 2.7, -0.04, '#92958d')
    addSeaWall()
  }

  if (state.year >= 1750) {
    harborGroup.add(createPier(-20, -8.2, pierLength * 0.56, 1.4, -0.35, '#8b6444'))
  }

  if (state.year >= 1880) {
    addQuay(-23, -7.7, 18, 2.3, -0.36, '#9da1a1')
    addQuay(23, -8.1, 20, 2.3, 0.35, '#9da1a1')
    addHarborCrane(-16, -6.1, 0.95)
    addHarborCrane(14, -6.4, 1.05)
  }

  if (state.year >= 1930) {
    addQuay(4, -14, 27, 3.2, 0.02, '#a7a9a8')
    addHarborCrane(3, -12.5, 1.18)
  }

  if (state.year >= 1965 && state.industry > 42) {
    addContainerTerminal()
  }

  if (state.year >= 1985 && state.industry > 70) {
    harborGroup.add(createWindTurbine(-34, -13, 1.1))
    harborGroup.add(createWindTurbine(33, -13, 0.95))
  }

  if (state.year >= 1970 && state.tourism > 34) {
    const slipCount = Math.round(3 + state.tourism / 14)
    for (let i = 0; i < slipCount; i += 1) {
      const x = 9 + i * 2.25
      harborGroup.add(createPier(x, -10.5, 7.5, 0.48, 0.03, '#c7ad80'))
    }
  }

  if (calculateMetrics().risk > 57 || (state.year >= 1965 && state.seaLevel > 55)) {
    addFloodBoards(oceanLevel)
  }

  enableShadows(harborGroup)
}

function rebuildTown() {
  clearGroup(townGroup)
  lighthouseBeams.length = 0
  smokePuffs.length = 0
  movingVehicles.length = 0

  if (state.year >= 200) {
    addRoad(-8, 8.8, 42, 1.15, -0.04)
  }
  if (state.year >= 900) {
    addRoad(2, 14.2, 52, 0.9, 0.02)
  }
  if (state.year >= 1880) {
    addRoad(7, 1.5, 35, 1.05, 0.07)
  }
  if (state.year >= 1930) {
    addRoad(5, 21.2, 72, 1.45, -0.03)
    addRoad(-30, 11, 1.1, 27, 0.03)
    addRoad(30, 12, 1.1, 25, -0.06)
  }

  addDryingRacks()

  const cottageCount = clamp(
    Math.round(1 + state.population / 18 + smoothstep(state.year, -500, 1750) * 5),
    state.year < 0 ? 1 : 3,
    cottageSites.length,
  )

  for (let i = 0; i < cottageCount; i += 1) {
    const [x, z, rotation] = cottageSites[i]
    const palette = i % 3
    const ancient = state.year < 900
    const colors = ancient ? ['#b99561', '#c59f68', '#a87945'] : ['#c58f65', '#d6b182', '#b87f58']
    const roofs = ancient ? ['#8a6a39', '#7c5b32', '#6b4423'] : ['#654321', '#74422d', '#4b5563']
    townGroup.add(
      createBuilding({
        name: `Fisher cottage ${i + 1}`,
        year: 1740,
        x,
        z,
        w: 2.7 + (i % 2) * 0.4,
        d: 2.4,
        h: 2 + (i % 3) * 0.18,
        color: colors[palette],
        roof: roofs[palette],
        rotation,
        kind: ancient ? 'hut' : 'cottage',
      }),
    )
  }

  for (const definition of buildingDefinitions) {
    if (state.year < definition.year || (definition.condition && !definition.condition(state))) {
      continue
    }

    if (definition.name === 'Lighthouse') {
      continue
    }

    townGroup.add(createBuilding(definition))
  }

  addUrbanGrowth()

  if (state.year >= 1750) {
    townGroup.add(createLighthouse(-29, -5.8))
  }

  if (state.year >= 1930 && state.industry > 48) {
    townGroup.add(createFuelDepot(-25, -1.7))
  }

  if (state.year >= 1930) {
    const vehicleCount = clamp(Math.round((state.population + state.industry) / 24), 3, 14)
    for (let i = 0; i < vehicleCount; i += 1) {
      const vehicle = createVehicle(-30 + i * 5.2, 3 + (i % 2) * 2.2, i % 2 ? '#f59e0b' : '#2563eb')
      vehicle.userData.index = i
      movingVehicles.push(vehicle)
      townGroup.add(vehicle)
    }
  }

  if (state.year >= 1988) {
    addSolarArray(20.5, 5.4, state.tourism > 45 ? 7 : 4)
  }

  enableShadows(townGroup)
}

function rebuildBoats() {
  clearGroup(boatGroup)
  animatedBoats.length = 0

  const { fleet } = calculateMetrics()
  const boatCount = clamp(Math.round(fleet * 0.82), state.year < 0 ? 3 : 5, 34)
  const berths = [
    [-12, -13, -0.08],
    [-7, -15.8, 0.12],
    [-2.5, -12.6, -0.22],
    [4, -15.4, 0.18],
    [10, -12.6, -0.12],
    [15, -16.2, 0.08],
    [-18, -10.5, 0.3],
    [21, -11.5, -0.32],
    [-23, -14.8, 0.24],
    [27, -15.3, -0.24],
    [1, -20.3, 0.04],
    [-7, -21.4, -0.18],
    [11, -21.8, 0.18],
    [-29, -10.7, 0.45],
    [31, -10.9, -0.45],
    [-17, -19.9, 0.14],
    [21, -20.5, -0.12],
    [0, -9.8, 0.03],
    [-38, -18.3, 0.35],
    [39, -18.7, -0.32],
    [-33, -26.4, 0.22],
    [33, -28.5, -0.18],
    [6, -30.2, 0.08],
    [-4, -33.5, -0.1],
    [18, -31.6, 0.16],
    [-20, -30.1, -0.16],
  ] as const

  for (let i = 0; i < boatCount; i += 1) {
    const [x, z, rotation] = berths[i % berths.length]
    const type = getBoatType(i)
    const boat = createBoat(type, i)
    boat.position.set(x + pseudo(i) * 1.1, getOceanLevel() + 0.38, z + pseudo(i + 4) * 0.9)
    boat.rotation.y = rotation + pseudo(i + 8) * 0.14
    boat.userData.baseY = boat.position.y
    boat.userData.phase = pseudo(i + 14) * Math.PI * 2
    if (i % 5 === 0) {
      boat.userData.route = {
        startX: -48 + pseudo(i + 21) * 18,
        endX: 46 - pseudo(i + 24) * 20,
        z: -25 - pseudo(i + 27) * 18,
        speed: 0.018 + pseudo(i + 30) * 0.025,
      }
    }
    animatedBoats.push(boat)
    boatGroup.add(boat)
  }

  const fishCount = clamp(Math.round(state.fishStock / 8), 1, 12)
  fishGlints.visible = state.fishStock > 18
  fishGlints.children.forEach((fish, index) => {
    fish.visible = index < fishCount
  })

  enableShadows(boatGroup)
}

function rebuildAtmosphere() {
  clearGroup(atmosphereGroup)
  gulls.length = 0
  rainLines = null

  const cloudCount = clamp(Math.round(5 + state.storminess / 8), 5, 18)
  for (let i = 0; i < cloudCount; i += 1) {
    const cloud = createCloud(
      -46 + i * (92 / cloudCount) + pseudo(i) * 5,
      18 + pseudo(i + 3) * 6,
      -24 + pseudo(i + 6) * 20,
      0.9 + pseudo(i + 9) * 0.7,
    )
    cloud.userData.speed = 0.16 + pseudo(i + 11) * 0.18
    atmosphereGroup.add(cloud)
  }

  const gullCount = clamp(Math.round(7 + state.tourism / 14 - state.storminess / 18), 2, 12)
  for (let i = 0; i < gullCount; i += 1) {
    const gull = createGull(i)
    gulls.push(gull)
    atmosphereGroup.add(gull)
  }

  if (state.storminess > 58) {
    rainLines = createRain()
    atmosphereGroup.add(rainLines)
  }
}

function updateLighting() {
  const storm = state.storminess / 100
  const modern = smoothstep(state.year, 1965, 1990)
  const ancientWarmth = 1 - smoothstep(state.year, -500, 1750)
  skyColor.setHSL(0.55 - ancientWarmth * 0.04, 0.68 - storm * 0.36, 0.66 - storm * 0.25)
  scene.background = skyColor
  scene.fog = new THREE.Fog(skyColor.clone(), 42 - storm * 12, 155 - storm * 50)
  hemiLight.intensity = 1.25 - storm * 0.34 + modern * 0.12
  sunLight.intensity = 3.6 - storm * 2.2
  fillLight.intensity = 0.82 + storm * 0.28
  oceanMaterial.color.setHSL(0.53, 0.72 - storm * 0.24, 0.39 - storm * 0.13)
  oceanMaterial.roughness = 0.16 + storm * 0.34
  bloomPass.strength = 0.2 + modern * 0.12 + (1 - storm) * 0.03
  renderer.toneMappingExposure = 1.12 - storm * 0.24
}

function animateOcean(elapsed: number) {
  const storm = state.storminess / 100
  const waveAmp = 0.18 + storm * 0.72
  const oceanLevel = getOceanLevel()

  for (let i = 0; i < oceanPosition.count; i += 1) {
    const x = oceanBasePositions[i * 3]
    const z = oceanBasePositions[i * 3 + 2]
    const y =
      oceanLevel +
      Math.sin(x * 0.16 + elapsed * (0.85 + storm)) * waveAmp * 0.44 +
      Math.cos(z * 0.18 + elapsed * (1.1 + storm * 1.4)) * waveAmp * 0.28 +
      Math.sin((x + z) * 0.07 + elapsed * 0.42) * waveAmp * 0.18
    oceanPosition.setY(i, y)
  }

  oceanPosition.needsUpdate = true

  frame += 1
  if (frame % 5 === 0) {
    oceanGeometry.computeVertexNormals()
  }
}

function animateBoats(elapsed: number) {
  const storm = state.storminess / 100
  const oceanLevel = getOceanLevel()

  for (const boat of animatedBoats) {
    const phase = boat.userData.phase as number
    const route = boat.userData.route as { startX: number; endX: number; z: number; speed: number } | undefined
    if (route) {
      const travel = (elapsed * route.speed + phase * 0.03) % 1
      boat.position.x = THREE.MathUtils.lerp(route.startX, route.endX, travel)
      boat.position.z = route.z + Math.sin(travel * Math.PI * 2 + phase) * 1.2
      boat.rotation.y = route.startX < route.endX ? Math.PI / 2 : -Math.PI / 2
    }
    boat.position.y = oceanLevel + 0.38 + Math.sin(elapsed * 1.7 + phase) * (0.08 + storm * 0.34)
    boat.rotation.z = Math.sin(elapsed * 1.25 + phase) * (0.025 + storm * 0.075)
    boat.rotation.x = Math.cos(elapsed * 1.08 + phase) * (0.018 + storm * 0.06)
  }

  for (const beam of lighthouseBeams) {
    beam.rotation.y += 0.012 + storm * 0.006
  }

  for (const turbine of windTurbines) {
    turbine.rotation.z += 0.04 + storm * 0.06
  }
}

function animateCity(elapsed: number) {
  for (const vehicle of movingVehicles) {
    const index = vehicle.userData.index as number
    const span = 62
    const speed = 0.15 + (index % 4) * 0.025
    const progress = (elapsed * speed + index * 0.17) % 1
    vehicle.position.x = -31 + progress * span
    vehicle.position.z = 3 + (index % 2) * 2.2 + Math.sin(elapsed * 0.6 + index) * 0.15
    vehicle.rotation.y = Math.PI / 2
  }
}

function animateAtmosphere(elapsed: number, delta: number) {
  for (const cloud of atmosphereGroup.children) {
    if (cloud.userData.speed) {
      cloud.position.x += (cloud.userData.speed as number) * delta * (1 + state.storminess / 80)
      if (cloud.position.x > 55) {
        cloud.position.x = -55
      }
    }
  }

  for (const gull of gulls) {
    const index = gull.userData.index as number
    const radius = 16 + (index % 4) * 5
    const speed = 0.18 + index * 0.013
    const angle = elapsed * speed + index
    gull.position.set(
      Math.cos(angle) * radius + pseudo(index) * 7,
      9 + Math.sin(elapsed * 1.7 + index) * 1.1 + (index % 3),
      -12 + Math.sin(angle) * radius * 0.42,
    )
    gull.rotation.y = -angle + Math.PI / 2
    gull.rotation.z = Math.sin(elapsed * 6 + index) * 0.22
  }

  if (rainLines) {
    rainLines.position.y -= delta * (18 + state.storminess * 0.14)
    if (rainLines.position.y < -10) {
      rainLines.position.y = 16
    }
  }

  for (const puff of smokePuffs) {
    const phase = puff.userData.phase as number
    const baseY = puff.userData.baseY as number
    puff.position.y = baseY + ((elapsed * 0.55 + phase) % 2.6)
    puff.position.x += Math.sin(elapsed + phase) * 0.0015
    const material = puff.material
    if (material instanceof THREE.MeshStandardMaterial) {
      material.opacity = 0.26 - ((puff.position.y - baseY) / 2.6) * 0.15
    }
  }

  fishGlints.children.forEach((fish, index) => {
    fish.position.y = getOceanLevel() + 0.08 + Math.sin(elapsed * 2 + index) * 0.06
    fish.rotation.y += 0.01 + index * 0.0008
  })
}

function createBuilding(definition: BuildingDefinition) {
  const group = new THREE.Group()
  group.name = definition.name
  group.position.set(definition.x, 0.16, definition.z)
  group.rotation.y = definition.rotation ?? 0

  if (definition.kind === 'hut') {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(definition.w * 0.42, definition.w * 0.5, definition.h, 10),
      makeMaterial(definition.color, 0.86),
    )
    base.position.y = definition.h / 2
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(definition.w * 0.62, definition.h * 0.85, 10),
      makeMaterial(definition.roof, 0.92),
    )
    roof.position.y = definition.h + definition.h * 0.36
    group.add(base, roof)
    return group
  }

  const body = box(definition.w, definition.h, definition.d, definition.color, 0, definition.h / 2, 0)
  group.add(body)

  const hasFlatRoof =
    definition.kind === 'industrial' ||
    definition.kind === 'research' ||
    definition.kind === 'warehouse' ||
    definition.kind === 'apartment' ||
    definition.kind === 'office' ||
    definition.kind === 'highrise' ||
    definition.kind === 'port' ||
    definition.kind === 'fort'
  if (hasFlatRoof) {
    group.add(box(definition.w + 0.35, 0.34, definition.d + 0.35, definition.roof, 0, definition.h + 0.17, 0))
  } else {
    const roof = createGableRoof(definition.w + 0.55, definition.d + 0.62, 0.9, definition.roof)
    roof.position.y = definition.h
    group.add(roof)
  }

  addWindows(group, definition)
  group.add(box(0.58, 0.92, 0.08, '#3d281d', 0, 0.58, -definition.d / 2 - 0.055))

  if (definition.kind === 'chapel' || definition.kind === 'temple') {
    group.add(box(1.05, 2.6, 1, definition.color, 0, definition.h + 1.25, -definition.d * 0.34))
    const steeple = new THREE.Mesh(
      new THREE.ConeGeometry(0.72, definition.kind === 'temple' ? 0.9 : 1.45, definition.kind === 'temple' ? 6 : 4),
      makeMaterial(definition.kind === 'temple' ? '#a16207' : '#4b5460', 0.82),
    )
    steeple.position.set(0, definition.h + 3.25, -definition.d * 0.34)
    steeple.rotation.y = Math.PI / 4
    group.add(steeple)
  }

  if (definition.kind === 'fort') {
    for (const xOffset of [-definition.w / 2 + 0.42, definition.w / 2 - 0.42]) {
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.48, 0.56, definition.h * 1.18, 12),
        makeMaterial(definition.color, 0.88),
      )
      tower.position.set(xOffset, (definition.h * 1.18) / 2, -definition.d / 2 + 0.35)
      group.add(tower)
    }
  }

  if (definition.kind === 'industrial') {
    const stackHeight = definition.h + 2.5
    const stack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.44, stackHeight, 14),
      makeMaterial('#3f332d', 0.88),
    )
    stack.position.set(definition.w * 0.34, stackHeight / 2, definition.d * 0.16)
    group.add(stack)

    if (state.year >= 1880 && state.industry > 28) {
      addSmokePuffs(group, stack.position.x, stackHeight + 0.8, stack.position.z)
    }

    group.add(box(definition.w * 0.78, 0.12, 0.14, '#f1f5d8', 0, definition.h * 0.58, -definition.d / 2 - 0.07))
  }

  if (definition.kind === 'market') {
    group.add(box(definition.w * 0.82, 0.34, 0.12, '#fef3c7', 0, definition.h * 0.72, -definition.d / 2 - 0.09))
    addAwning(group, definition.w, definition.d, '#e11d48')
  }

  if (definition.kind === 'hotel') {
    group.add(box(definition.w * 0.68, 0.2, 0.16, '#fff7ed', 0, definition.h * 0.3, -definition.d / 2 - 0.1))
    addAwning(group, definition.w * 0.75, definition.d, '#0f766e')
  }

  if (definition.kind === 'research') {
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(1.05, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: '#a7f3d0',
        roughness: 0.18,
        metalness: 0.02,
        transparent: true,
        opacity: 0.72,
      }),
    )
    dome.position.set(-definition.w * 0.24, definition.h + 0.15, 0)
    group.add(dome)
  }

  if (definition.kind === 'highrise' || definition.kind === 'office') {
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 2.1, 8), makeMaterial('#cbd5e1', 0.35))
    antenna.position.set(definition.w * 0.25, definition.h + 1.2, definition.d * 0.2)
    group.add(antenna)
  }

  return group
}

function addWindows(group: THREE.Group, definition: BuildingDefinition) {
  const floors =
    definition.kind === 'highrise'
      ? Math.max(6, Math.floor(definition.h / 1.15))
      : definition.kind === 'office' || definition.kind === 'apartment' || definition.kind === 'hotel'
        ? Math.max(3, Math.floor(definition.h / 1.25))
        : definition.h > 3
          ? 2
          : 1
  const columns = Math.max(2, Math.floor(definition.w / (definition.kind === 'highrise' ? 0.9 : 1.35)))
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: '#ffd98a',
    emissive: '#ffb84d',
    emissiveIntensity: 0.18 + state.storminess / 350,
    roughness: 0.35,
  })

  for (let floor = 0; floor < floors; floor += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (definition.kind === 'industrial' && (column + floor) % 2 === 0) {
        continue
      }

      const x = -definition.w * 0.36 + column * ((definition.w * 0.72) / Math.max(1, columns - 1))
      const y = 0.95 + floor * (definition.h / (floors + 0.7))
      const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.045), windowMaterial)
      windowMesh.position.set(x, y, -definition.d / 2 - 0.045)
      group.add(windowMesh)

      if (definition.kind === 'highrise' || definition.kind === 'office') {
        const sideWindow = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.42, 0.42), windowMaterial)
        sideWindow.position.set(definition.w / 2 + 0.045, y, -definition.d * 0.28 + column * (definition.d * 0.56) / Math.max(1, columns - 1))
        group.add(sideWindow)
      }
    }
  }
}

function createLighthouse(x: number, z: number) {
  const group = new THREE.Group()
  group.name = 'Lighthouse'
  group.position.set(x, 0.2, z)

  for (let i = 0; i < 6; i += 1) {
    const section = new THREE.Mesh(
      new THREE.CylinderGeometry(0.78 - i * 0.045, 0.9 - i * 0.045, 0.82, 20),
      makeMaterial(i % 2 === 0 ? '#f8fafc' : '#b91c1c', 0.78),
    )
    section.position.y = 0.42 + i * 0.82
    group.add(section)
  }

  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.6, 18), makeMaterial('#263238', 0.45))
  lantern.position.y = 5.45
  group.add(lantern)

  const light = new THREE.PointLight('#ffd166', 1.8, 36, 1.6)
  light.position.set(0, 5.5, 0)
  group.add(light)

  const beamMaterial = new THREE.MeshBasicMaterial({
    color: '#ffe8a3',
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.4, 20, 32, 1, true), beamMaterial)
  beam.position.set(8.7, 5.48, 0)
  beam.rotation.z = -Math.PI / 2
  lighthouseBeams.push(beam)
  group.add(beam)

  const cap = new THREE.Mesh(new THREE.ConeGeometry(1.15, 0.9, 18), makeMaterial('#991b1b', 0.68))
  cap.position.y = 6.2
  group.add(cap)

  return group
}

function addMastAndSail(
  group: THREE.Group,
  scale: number,
  sailColor: string,
  rig: 'square' | 'triangle' | 'lateen',
  zOffset = 0,
) {
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * scale, 0.065 * scale, 3.2 * scale, 8), makeMaterial('#3d281d', 0.7))
  mast.position.set(0, 1.75 * scale, zOffset)
  group.add(mast)

  if (rig === 'square') {
    const sail = new THREE.Mesh(
      new THREE.PlaneGeometry(1.55 * scale, 1.45 * scale),
      new THREE.MeshStandardMaterial({ color: sailColor, roughness: 0.88, side: THREE.DoubleSide }),
    )
    sail.position.set(0, 2.05 * scale, zOffset - 0.03)
    group.add(sail)
    return
  }

  const points: [number, number, number][] =
    rig === 'lateen'
      ? [
          [-0.62 * scale, 0.6 * scale, zOffset],
          [0.2 * scale, 2.9 * scale, zOffset],
          [1.5 * scale, 0.9 * scale, zOffset],
        ]
      : [
          [0.06 * scale, 0.45 * scale, zOffset],
          [0.06 * scale, 2.8 * scale, zOffset],
          [1.35 * scale, 0.7 * scale, zOffset],
        ]
  group.add(createTriangleMesh(points, sailColor))
}

function createBoat(type: BoatType, index: number) {
  const group = new THREE.Group()
  group.name = `${type} boat`
  const colors = ['#b91c1c', '#0f766e', '#1d4ed8', '#f59e0b', '#f8fafc', '#7c3aed', '#0f172a']
  const hullColor = colors[index % colors.length]
  const scale =
    type === 'factory' || type === 'container'
      ? 2.35
      : type === 'ferry'
        ? 1.85
        : type === 'trawler'
          ? 1.35
          : type === 'steamer'
            ? 1.18
            : type === 'yacht'
              ? 0.9
              : type === 'dugout'
                ? 0.58
                : type === 'galley'
                  ? 1
                  : 0.92

  const hull = new THREE.Mesh(createHullGeometry(1.65 * scale, 0.75 * scale, 4.3 * scale), makeMaterial(hullColor, 0.56))
  hull.position.y = 0.25 * scale
  group.add(hull)

  if (type === 'dugout') {
    group.add(box(0.1 * scale, 0.08 * scale, 4.2 * scale, '#3d281d', -0.52 * scale, 0.65 * scale, 0))
    group.add(box(0.1 * scale, 0.08 * scale, 4.2 * scale, '#3d281d', 0.52 * scale, 0.65 * scale, 0))
  } else if (type === 'galley') {
    addMastAndSail(group, scale, '#f7e7bd', 'square')
    for (let oar = 0; oar < 8; oar += 1) {
      const left = box(0.08 * scale, 0.04 * scale, 1.7 * scale, '#5b3a24', -0.86 * scale, 0.55 * scale, -1.6 * scale + oar * 0.45 * scale)
      const right = box(0.08 * scale, 0.04 * scale, 1.7 * scale, '#5b3a24', 0.86 * scale, 0.55 * scale, -1.6 * scale + oar * 0.45 * scale)
      left.rotation.z = 0.8
      right.rotation.z = -0.8
      group.add(left, right)
    }
  } else if (type === 'cog' || type === 'caravel' || type === 'lugger' || type === 'schooner') {
    addMastAndSail(group, scale, type === 'cog' ? '#f4deb3' : '#f8fafc', type === 'cog' ? 'square' : 'lateen')
    if (type === 'caravel' || type === 'schooner') {
      addMastAndSail(group, scale * 0.82, '#fff7ed', 'triangle', -0.95 * scale)
    }
  } else if (type === 'sail') {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 3.1 * scale, 8), makeMaterial('#4b3427', 0.7))
    mast.position.y = 1.78 * scale
    group.add(mast)
    const sail = createTriangleMesh(
      [
        [0.08, 0.5, 0],
        [0.08, 2.8 * scale, 0],
        [1.45 * scale, 0.75, 0],
      ],
      '#f7f0dc',
    )
    sail.position.z = -0.18
    group.add(sail)
  } else {
    const cabinColor = type === 'yacht' || type === 'ferry' ? '#ffffff' : '#e2e8f0'
    group.add(box((type === 'factory' || type === 'container' ? 1.55 : 1.05) * scale, 0.8 * scale, 1.05 * scale, cabinColor, 0, 0.88 * scale, -0.38 * scale))

    if (type !== 'yacht' && type !== 'ferry') {
      const boom = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 3.4 * scale), makeMaterial('#2f2a24', 0.7))
      boom.position.set(0.72 * scale, 1.32 * scale, 0.56 * scale)
      boom.rotation.x = -0.35
      group.add(boom)
      group.add(box(0.95 * scale, 0.08 * scale, 1.55 * scale, '#64748b', -0.75 * scale, 0.82 * scale, 0.65 * scale))
    }

    if (type === 'factory' || type === 'container') {
      for (let c = 0; c < 7; c += 1) {
        group.add(box(0.62 * scale, 0.34 * scale, 0.48 * scale, colors[(index + c + 2) % colors.length], -1.2 * scale + c * 0.4 * scale, 1.12 * scale, 0.62 * scale))
      }
    }

    if (type === 'ferry') {
      group.add(box(1.4 * scale, 0.35 * scale, 2.8 * scale, '#dbeafe', 0, 1.32 * scale, 0.15 * scale))
      group.add(box(1.55 * scale, 0.14 * scale, 3.15 * scale, '#1e3a8a', 0, 0.82 * scale, 0.15 * scale))
    }
  }

  if (type === 'steamer' || type === 'factory' || type === 'ferry') {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.95 * scale, 10), makeMaterial('#2f2a24', 0.65))
    stack.position.set(0.45 * scale, 1.35 * scale, -0.62 * scale)
    group.add(stack)
  }

  return group
}

function getBoatType(index: number): BoatType {
  if (state.year < 0) {
    return index % 3 === 0 ? 'galley' : 'dugout'
  }

  if (state.year < 900) {
    return index % 3 === 0 ? 'galley' : 'lugger'
  }

  if (state.year < 1450) {
    return index % 4 === 0 ? 'cog' : 'lugger'
  }

  if (state.year < 1750) {
    return index % 4 === 0 ? 'caravel' : 'lugger'
  }

  if (state.year < 1880) {
    return index % 3 === 0 ? 'schooner' : 'lugger'
  }

  if (state.year < 1930) {
    return index % 3 === 0 ? 'steamer' : 'schooner'
  }

  if (state.year >= 1965 && state.industry > 55 && index % 8 === 0) {
    return index % 16 === 0 ? 'container' : 'factory'
  }

  if (state.year >= 1965 && state.tourism > 45 && index % 6 === 0) {
    return 'ferry'
  }

  if (state.year >= 1970 && state.tourism > 42 && index % 4 === 0) {
    return 'yacht'
  }

  return index % 5 === 0 && state.year < 1960 ? 'steamer' : 'trawler'
}

function createPier(x: number, z: number, length: number, width: number, rotation: number, color: string) {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  group.rotation.y = rotation
  group.add(box(width, 0.25, length, color, 0, 0.36, -length / 2))

  const postMaterial = makeMaterial('#4b3427', 0.7)
  for (let i = 0; i < Math.floor(length / 2.4); i += 1) {
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.25, 8), postMaterial)
      post.position.set((width / 2 - 0.12) * side, -0.12, -1.2 - i * 2.35)
      group.add(post)
    }
  }

  return group
}

function addQuay(x: number, z: number, width: number, depth: number, rotation: number, color: string) {
  const quay = box(width, 0.72, depth, color, x, 0.28, z)
  quay.rotation.y = rotation
  harborGroup.add(quay)
}

function addShorelineFoam(oceanLevel: number) {
  const material = new THREE.LineBasicMaterial({
    color: '#dffcff',
    transparent: true,
    opacity: 0.55,
  })
  const points = coastlinePoints.map(([x, z]) => new THREE.Vector3(x, oceanLevel + 0.035, z - 0.28))
  const curve = new THREE.CatmullRomCurve3(points)
  const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(110))
  const foam = new THREE.Line(geometry, material)
  harborGroup.add(foam)
}

function addSeaWall() {
  for (let i = 0; i < coastlinePoints.length - 1; i += 2) {
    const [x1, z1] = coastlinePoints[i]
    const [x2, z2] = coastlinePoints[i + 1]
    const wall = box(Math.hypot(x2 - x1, z2 - z1), 0.55, 0.34, '#7c8178', (x1 + x2) / 2, 0.42, (z1 + z2) / 2 + 0.2)
    wall.rotation.y = Math.atan2(z2 - z1, x2 - x1)
    harborGroup.add(wall)
  }
}

function addHarborCrane(x: number, z: number, scale: number) {
  const group = new THREE.Group()
  group.position.set(x, 0.42, z)
  group.add(box(0.42 * scale, 4.2 * scale, 0.42 * scale, '#f59e0b', 0, 2.1 * scale, 0))
  const boom = box(5.8 * scale, 0.22 * scale, 0.22 * scale, '#fbbf24', 2.7 * scale, 4.15 * scale, 0)
  boom.rotation.z = 0.14
  group.add(boom)
  group.add(box(0.16 * scale, 1.2 * scale, 0.16 * scale, '#111827', 5.1 * scale, 3.45 * scale, 0))
  harborGroup.add(group)
}

function addContainerTerminal() {
  addQuay(31, -17.8, 27, 4.6, 0.02, '#9ca3af')
  for (let i = 0; i < 36; i += 1) {
    const row = Math.floor(i / 9)
    const color = ['#dc2626', '#2563eb', '#f97316', '#16a34a', '#eab308'][i % 5]
    const container = box(1.75, 0.7, 0.82, color, 20 + (i % 9) * 2.15, 0.92 + (i % 3 === 0 ? 0.72 : 0), -19.8 - row * 1.15)
    harborGroup.add(container)
  }
  addHarborCrane(21, -15.3, 1.3)
  addHarborCrane(31, -15.6, 1.45)
  addHarborCrane(41, -15.8, 1.25)
}

function addFloodBoards(oceanLevel: number) {
  const color = oceanLevel > 1.1 ? '#d97706' : '#f59e0b'
  for (let i = 0; i < 9; i += 1) {
    const board = box(2.1, 0.34, 0.32, color, -13 + i * 3.4, 0.72, -1.35)
    board.rotation.y = 0.02
    harborGroup.add(board)
  }
}

function addRoad(x: number, z: number, width: number, depth: number, rotation: number) {
  const road = box(width, 0.05, depth, '#756b5a', x, 0.19, z)
  road.rotation.y = rotation
  townGroup.add(road)
}

function addDryingRacks() {
  if (state.year > 1935 && state.industry > 70) {
    return
  }

  for (let rack = 0; rack < 4; rack += 1) {
    const group = new THREE.Group()
    group.position.set(-18 + rack * 2.2, 0.25, 4.1 + (rack % 2) * 1.25)
    group.rotation.y = -0.18
    group.add(box(1.7, 0.08, 0.08, '#5b4636', 0, 1.2, 0))
    for (const side of [-0.7, 0.7]) {
      group.add(box(0.08, 1.15, 0.08, '#5b4636', side, 0.68, 0))
    }
    for (let strip = 0; strip < 4; strip += 1) {
      group.add(box(0.18, 0.76, 0.035, '#e8d5a9', -0.55 + strip * 0.36, 0.72, -0.04))
    }
    townGroup.add(group)
  }
}

function addUrbanGrowth() {
  const growth = clamp(
    Math.round(
      smoothstep(state.year, 900, 1990) * 26 +
        smoothstep(state.year, 1750, 1990) * 24 +
        smoothstep(state.year, 1930, 1990) * 26 +
        state.population * 0.18,
    ),
    0,
    82,
  )

  const districts = [
    { x: -34, z: 14, columns: 7, rows: 4, spacingX: 5.1, spacingZ: 4.1 },
    { x: 2, z: 15, columns: 7, rows: 4, spacingX: 5.0, spacingZ: 4.0 },
    { x: -24, z: 30, columns: 9, rows: 2, spacingX: 5.2, spacingZ: 4.2 },
  ]

  let added = 0
  let seed = 0
  for (const district of districts) {
    for (let row = 0; row < district.rows; row += 1) {
      for (let column = 0; column < district.columns; column += 1) {
        if (added >= growth) {
          return
        }

        const x = district.x + column * district.spacingX + (pseudo(seed) - 0.5) * 0.8
        const z = district.z + row * district.spacingZ + (pseudo(seed + 4) - 0.5) * 0.8
        const modern = state.year >= 1930
        const metropolis = state.year >= 1965
        const kind: BuildingDefinition['kind'] =
          metropolis && added % 9 === 0
            ? 'highrise'
            : metropolis && added % 5 === 0
              ? 'office'
              : modern && added % 3 === 0
                ? 'apartment'
                : state.year >= 1750 && added % 4 === 0
                  ? 'warehouse'
                  : state.year >= 900 && added % 6 === 0
                    ? 'market'
                    : state.year < 1450
                      ? 'cottage'
                      : 'warehouse'
        const height =
          kind === 'highrise'
            ? 11 + pseudo(seed + 2) * 15
            : kind === 'office'
              ? 7 + pseudo(seed + 2) * 7
              : kind === 'apartment'
                ? 4.2 + pseudo(seed + 2) * 4.5
                : kind === 'warehouse'
                  ? 2.5 + pseudo(seed + 2) * 2.5
                  : 2.1 + pseudo(seed + 2) * 1.6
        const palette = getUrbanPalette(kind, seed)
        townGroup.add(
          createBuilding({
            name: `Urban ${kind} ${added + 1}`,
            year: state.year,
            x,
            z,
            w: kind === 'highrise' ? 3.8 + pseudo(seed + 3) * 2.6 : 3 + pseudo(seed + 3) * 3.2,
            d: kind === 'highrise' ? 3.4 + pseudo(seed + 5) * 2.2 : 2.5 + pseudo(seed + 5) * 3.4,
            h: height,
            color: palette.body,
            roof: palette.roof,
            rotation: (pseudo(seed + 8) - 0.5) * 0.28,
            kind,
          }),
        )
        added += 1
        seed += 1
      }
    }
  }
}

function getUrbanPalette(kind: BuildingDefinition['kind'], seed: number) {
  if (kind === 'highrise' || kind === 'office') {
    const bodies = ['#8fb5c7', '#9aa9b5', '#b6c4cf', '#6f8ea3']
    return { body: bodies[seed % bodies.length], roof: '#1f2937' }
  }

  if (kind === 'apartment') {
    const bodies = ['#d6b58a', '#c4a484', '#b9afa2', '#e7c69a']
    return { body: bodies[seed % bodies.length], roof: '#475569' }
  }

  if (kind === 'warehouse') {
    const bodies = ['#8a8d86', '#9d7651', '#7f8c8d', '#b08a64']
    return { body: bodies[seed % bodies.length], roof: '#334155' }
  }

  const bodies = ['#c58f65', '#d6b182', '#b87f58', '#e0d3bb']
  return { body: bodies[seed % bodies.length], roof: '#563627' }
}

function createFuelDepot(x: number, z: number) {
  const group = new THREE.Group()
  group.position.set(x, 0.18, z)
  for (let i = 0; i < 3; i += 1) {
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 1.45, 24),
      makeMaterial(i === 1 ? '#b91c1c' : '#cbd5e1', 0.4),
    )
    tank.rotation.z = Math.PI / 2
    tank.position.set(i * 2.15, 0.95, 0)
    group.add(tank)
  }
  return group
}

function addSolarArray(x: number, z: number, count: number) {
  for (let i = 0; i < count; i += 1) {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.06, 0.85),
      new THREE.MeshStandardMaterial({
        color: '#102a43',
        metalness: 0.15,
        roughness: 0.28,
        emissive: '#0ea5e9',
        emissiveIntensity: 0.05,
      }),
    )
    panel.position.set(x + (i % 4) * 1.65, 0.78, z + Math.floor(i / 4) * 1.1)
    panel.rotation.x = -0.45
    panel.rotation.y = -0.12
    townGroup.add(panel)
  }
}

function createWindTurbine(x: number, z: number, scale: number) {
  const group = new THREE.Group()
  group.position.set(x, 0.1, z)
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.22 * scale, 7.5 * scale, 16), makeMaterial('#e2e8f0', 0.38))
  tower.position.y = 3.75 * scale
  group.add(tower)

  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.34 * scale, 16, 12), makeMaterial('#f8fafc', 0.35))
  hub.position.set(0, 7.72 * scale, 0)
  group.add(hub)

  const blades = new THREE.Group()
  blades.position.copy(hub.position)
  for (let i = 0; i < 3; i += 1) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 2.45 * scale, 0.05 * scale), makeMaterial('#f8fafc', 0.42))
    blade.position.y = 1.22 * scale
    blade.rotation.z = (i * Math.PI * 2) / 3
    blades.add(blade)
  }

  windTurbines.push(blades)
  group.add(blades)
  return group
}

function createVehicle(x: number, z: number, color: string) {
  const group = new THREE.Group()
  group.position.set(x, 0.28, z)
  group.rotation.y = 0.08
  group.add(box(1.35, 0.42, 0.72, color, 0, 0.28, 0))
  group.add(box(0.72, 0.34, 0.58, '#bfdbfe', -0.08, 0.66, -0.02))
  for (const xOffset of [-0.43, 0.43]) {
    for (const zOffset of [-0.3, 0.3]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12), makeMaterial('#111827', 0.55))
      wheel.rotation.z = Math.PI / 2
      wheel.position.set(xOffset, 0.12, zOffset)
      group.add(wheel)
    }
  }
  return group
}

function createCloud(x: number, y: number, z: number, scale: number) {
  const group = new THREE.Group()
  group.position.set(x, y, z)
  const storm = state.storminess / 100
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.6, 0.16, 0.92 - storm * 0.42),
    roughness: 0.9,
    transparent: true,
    opacity: 0.72 + storm * 0.18,
  })

  for (let i = 0; i < 5; i += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry((0.8 + pseudo(i) * 0.55) * scale, 16, 12), material)
    puff.position.set((i - 2) * 0.88 * scale, pseudo(i + 5) * 0.45 * scale, pseudo(i + 9) * 0.38 * scale)
    group.add(puff)
  }

  return group
}

function createGull(index: number) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [-0.46, 0, 0, 0, 0.12, 0, 0, 0.12, 0, 0.46, 0, 0],
      3,
    ),
  )
  const gull = new THREE.Group()
  const line = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color: '#f8fafc',
      transparent: true,
      opacity: 0.92,
    }),
  )
  gull.add(line)
  gull.userData.index = index
  return gull
}

function createRain() {
  const count = 180
  const vertices: number[] = []
  for (let i = 0; i < count; i += 1) {
    const x = -48 + pseudo(i) * 96
    const y = -2 + pseudo(i + 5) * 28
    const z = -35 + pseudo(i + 9) * 55
    vertices.push(x, y, z, x + 0.45, y - 1.5, z + 0.05)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  return new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color: '#b8d7f6',
      transparent: true,
      opacity: 0.42,
    }),
  )
}

function createFishGlints() {
  const group = new THREE.Group()
  const material = new THREE.MeshBasicMaterial({
    color: '#bff7ff',
    transparent: true,
    opacity: 0.74,
    side: THREE.DoubleSide,
  })

  for (let i = 0; i < 14; i += 1) {
    const fish = new THREE.Mesh(new THREE.CircleGeometry(0.22 + pseudo(i) * 0.16, 12), material)
    fish.position.set(-24 + pseudo(i + 1) * 48, getOceanLevel() + 0.1, -24 + pseudo(i + 2) * 14)
    fish.rotation.x = -Math.PI / 2
    fish.scale.set(1.8, 0.32, 1)
    group.add(fish)
  }

  return group
}

function addHill(x: number, z: number, radius: number, height: number, color: string) {
  const hill = new THREE.Mesh(
    new THREE.ConeGeometry(radius, height, 9),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.96,
    }),
  )
  hill.position.set(x, height / 2 - 0.2, z)
  hill.rotation.y = pseudo(radius) * Math.PI
  hill.receiveShadow = true
  hill.castShadow = true
  terrainGroup.add(hill)
}

function createTree(x: number, z: number, scale: number) {
  const group = new THREE.Group()
  group.position.set(x, 0.1, z)
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.17 * scale, 0.9 * scale, 8), makeMaterial('#6b4423', 0.85))
  trunk.position.y = 0.45 * scale
  group.add(trunk)

  const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.72 * scale, 1.8 * scale, 9), makeMaterial('#244f2d', 0.92))
  canopy.position.y = 1.45 * scale
  group.add(canopy)
  enableShadows(group)
  return group
}

function addSmokePuffs(parent: THREE.Group, x: number, y: number, z: number) {
  for (let i = 0; i < 4; i += 1) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(0.28 + i * 0.08, 14, 10),
      new THREE.MeshStandardMaterial({
        color: '#9ca3af',
        roughness: 1,
        transparent: true,
        opacity: 0.22,
      }),
    )
    puff.position.set(x + i * 0.14, y + i * 0.45, z + i * 0.06)
    puff.userData.baseY = puff.position.y
    puff.userData.phase = i * 0.55 + pseudo(i)
    smokePuffs.push(puff)
    parent.add(puff)
  }
}

function addAwning(parent: THREE.Group, width: number, depth: number, color: string) {
  const awning = box(width, 0.16, 0.62, color, 0, 1.58, -depth / 2 - 0.38)
  awning.rotation.x = -0.18
  parent.add(awning)
}

function box(width: number, height: number, depth: number, color: string, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), makeMaterial(color, 0.72))
  mesh.position.set(x, y, z)
  return mesh
}

function makeMaterial(color: string, roughness: number) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness: 0.03,
  })
}

function createGableRoof(width: number, depth: number, height: number, color: string) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        -width / 2,
        0,
        -depth / 2,
        width / 2,
        0,
        -depth / 2,
        0,
        height,
        -depth / 2,
        -width / 2,
        0,
        depth / 2,
        width / 2,
        0,
        depth / 2,
        0,
        height,
        depth / 2,
      ],
      3,
    ),
  )
  geometry.setIndex([0, 1, 2, 3, 5, 4, 0, 2, 5, 0, 5, 3, 1, 4, 5, 1, 5, 2])
  geometry.computeVertexNormals()
  return new THREE.Mesh(geometry, makeMaterial(color, 0.68))
}

function createHullGeometry(width: number, height: number, length: number) {
  const w = width / 2
  const h = height
  const l = length / 2
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        -w,
        0,
        -l,
        w,
        0,
        -l,
        w * 0.72,
        h,
        -l * 0.82,
        -w * 0.72,
        h,
        -l * 0.82,
        -w,
        0,
        l * 0.62,
        w,
        0,
        l * 0.62,
        0,
        h * 0.82,
        l,
      ],
      3,
    ),
  )
  geometry.setIndex([
    0, 1, 2, 0, 2, 3, 4, 6, 5, 0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 0, 3, 6, 0, 6, 4, 3, 2, 6,
  ])
  geometry.computeVertexNormals()
  return geometry
}

function createTriangleMesh(points: [number, number, number][], color: string) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3))
  geometry.setIndex([0, 1, 2])
  geometry.computeVertexNormals()
  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.82,
      side: THREE.DoubleSide,
    }),
  )
}

function moveShapeTo(shape: THREE.Shape, x: number, z: number) {
  shape.moveTo(x, -z)
}

function lineShapeTo(shape: THREE.Shape, x: number, z: number) {
  shape.lineTo(x, -z)
}

function bezierShapeTo(shape: THREE.Shape, x1: number, z1: number, x2: number, z2: number, x: number, z: number) {
  shape.bezierCurveTo(x1, -z1, x2, -z2, x, -z)
}

function getOceanLevel() {
  return -0.22 + state.seaLevel * 0.0046
}

function getYearSpeed(year: number) {
  if (year < 0) {
    return 92
  }
  if (year < 900) {
    return 64
  }
  if (year < 1750) {
    return 36
  }
  if (year < 1880) {
    return 15
  }
  if (year < 1965) {
    return 8
  }
  return 4.5
}

function smoothstep(value: number, min: number, max: number) {
  const x = clamp((value - min) / (max - min), 0, 1)
  return x * x * (3 - 2 * x)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function pseudo(seed: number) {
  return (Math.sin(seed * 91.345 + 17.23) + 1) / 2
}

function requiredElement<T extends Element>(selector: string) {
  const element = document.querySelector<T>(selector)
  if (!element) {
    throw new Error(`Expected ${selector} to exist.`)
  }
  return element
}

function enableShadows(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })
}

function clearGroup(group: THREE.Group) {
  for (const child of [...group.children]) {
    group.remove(child)
    disposeObject(child)
  }
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments) {
      child.geometry.dispose()
      const material = child.material
      if (Array.isArray(material)) {
        material.forEach((entry) => entry.dispose())
      } else {
        material.dispose()
      }
    }
  })
}
