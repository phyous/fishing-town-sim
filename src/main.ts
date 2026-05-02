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

type MaterialStyle =
  | 'plaster'
  | 'wood'
  | 'stone'
  | 'roof'
  | 'metal'
  | 'glass'
  | 'sail'
  | 'hull'
  | 'grass'
  | 'sand'
  | 'concrete'
  | 'road'
  | 'rubber'
  | 'water'

const textureCache = new Map<string, THREE.CanvasTexture>()

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
    hint: 'Builds darker skies, bigger waves, rain, and rougher seas.',
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
  {
    name: 'Ship chandlery',
    year: 1760,
    x: -30,
    z: 9.8,
    w: 4.6,
    d: 3,
    h: 2.7,
    color: '#c08a5a',
    roof: '#4b5563',
    rotation: 0.12,
    kind: 'market',
  },
  {
    name: 'Civic fish exchange',
    year: 1888,
    x: 26,
    z: 7,
    w: 8.2,
    d: 4.4,
    h: 4.4,
    color: '#b9afa2',
    roof: '#374151',
    rotation: -0.16,
    kind: 'market',
    condition: (sim) => sim.industry > 34,
  },
  {
    name: 'Cold storage block',
    year: 1936,
    x: -36,
    z: 2.6,
    w: 8.4,
    d: 5,
    h: 5.2,
    color: '#b7c5c9',
    roof: '#263238',
    rotation: 0.08,
    kind: 'industrial',
    condition: (sim) => sim.industry > 48,
  },
  {
    name: 'Waterfront apartments',
    year: 1968,
    x: 34,
    z: 15.8,
    w: 7.2,
    d: 5.4,
    h: 8.8,
    color: '#d8c2a3',
    roof: '#475569',
    rotation: -0.1,
    kind: 'apartment',
    condition: (sim) => sim.population > 58,
  },
  {
    name: 'Harbor office tower',
    year: 1978,
    x: 46,
    z: 18.2,
    w: 5.2,
    d: 4.8,
    h: 14.5,
    color: '#8fb5c7',
    roof: '#1f2937',
    rotation: 0.06,
    kind: 'office',
    condition: (sim) => sim.population > 70 || sim.industry > 58,
  },
  {
    name: 'Marina hotel',
    year: 1982,
    x: -42,
    z: 15.4,
    w: 7.8,
    d: 5.8,
    h: 7.6,
    color: '#f0d5a5',
    roof: '#0f766e',
    rotation: 0.18,
    kind: 'hotel',
    condition: (sim) => sim.tourism > 46,
  },
]

const cottageSites = [
  [-38, 8.8, -0.18],
  [-33, 13.6, 0.22],
  [-28, 8.2, -0.24],
  [-23, 7.3, -0.24],
  [-20, 12.5, 0.22],
  [-15.5, 17.3, -0.08],
  [-13, 12.3, -0.1],
  [-7, 11.5, 0.18],
  [-1, 14.1, -0.25],
  [4, 18.4, -0.18],
  [7.3, 15.1, 0.14],
  [13.5, 14.7, -0.16],
  [18.8, 17.8, 0.1],
  [21, 9.4, 0.24],
  [23.5, 3.5, -0.06],
  [29, 12.8, 0.18],
  [35.5, 16.2, -0.2],
  [42, 20.5, 0.14],
  [-47, 17, 0.08],
  [-50, 25.5, -0.16],
  [-41, 28, 0.22],
  [-31.5, 25, -0.12],
  [-22, 23.8, 0.18],
  [-9, 25.7, -0.06],
  [8, 25, 0.1],
  [25, 25.5, -0.18],
  [39, 29.8, 0.08],
  [52, 28.4, -0.12],
] as const

const coastlinePoints = [
  [-124, 9],
  [-106, 5],
  [-92, -2],
  [-76, -5],
  [-60, -12],
  [-45, -9],
  [-34, -2.8],
  [-24, -0.4],
  [-16, -8],
  [-8, -16],
  [4, -14],
  [16, -7],
  [30, -1.2],
  [44, 3],
  [59, 10.5],
  [78, 18],
  [99, 24],
  [124, 28],
] as const

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('Expected #app element to exist.')
}

app.innerHTML = `
  <main class="shell">
    <section class="intro-panel">
      <div class="intro-copy">
        <p class="eyebrow">Temporal 3D harbor simulator</p>
        <h1>Fishing town to port metropolis.</h1>
        <p class="lede">
          Scrub from an ancient fishing cove to a 1990 industrial port city with
          historically grounded boats, buildings, harbor works, weather, and growth.
        </p>
        <p class="key-hints" aria-label="Keyboard camera controls">
          <span>A left</span>
          <span>S down</span>
          <span>D right</span>
          <span>W up</span>
          <span>Q rotate ccw</span>
          <span>E rotate cw</span>
        </p>
      </div>
      <div class="metrics header-metrics" aria-label="Simulation metrics">
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
      <article class="era-card header-era-card">
        <p class="eyebrow">Current era</p>
        <h3 id="era-card-title">—</h3>
        <p id="era-details">—</p>
        <ul id="era-notes"></ul>
      </article>
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
      </aside>
    </section>
  </main>
`

const canvas = requiredElement<HTMLCanvasElement>('#town-canvas')
const viewport = requiredElement<HTMLElement>('.viewport-card')
const playButton = requiredElement<HTMLButtonElement>('#play-button')
const yearReadout = requiredElement<HTMLElement>('#year-readout')
const eraTag = requiredElement<HTMLElement>('#era-tag')
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
scene.fog = new THREE.Fog(skyColor.clone(), 62, 235)

const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 400)
camera.position.set(72, 48, 78)

const composer = new EffectComposer(renderer)
const renderPass = new RenderPass(scene, camera)
const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.24, 0.52, 0.76)
composer.addPass(renderPass)
composer.addPass(bloomPass)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true
controls.dampingFactor = 0.06
controls.minDistance = 30
controls.maxDistance = 185
controls.maxPolarAngle = Math.PI * 0.47
controls.target.set(6, 2.6, 8)

const hemiLight = new THREE.HemisphereLight('#dff7ff', '#3e2d22', 1.45)
const sunLight = new THREE.DirectionalLight('#ffe2aa', 3.1)
sunLight.position.set(-30, 42, 24)
sunLight.castShadow = true
sunLight.shadow.mapSize.set(2048, 2048)
sunLight.shadow.camera.left = -105
sunLight.shadow.camera.right = 105
sunLight.shadow.camera.top = 105
sunLight.shadow.camera.bottom = -105
sunLight.shadow.camera.near = 1
sunLight.shadow.camera.far = 220

const fillLight = new THREE.DirectionalLight('#9dc9ff', 0.85)
fillLight.position.set(25, 20, -28)
const lightningLight = new THREE.PointLight('#dbeafe', 0, 170, 1.5)
lightningLight.position.set(-8, 30, -20)

scene.add(hemiLight, sunLight, fillLight, lightningLight)

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
const lightningBolts: THREE.LineSegments[] = []
let rainLines: THREE.LineSegments | null = null
let whitecapLines: THREE.LineSegments | null = null

const oceanGeometry = createOceanGeometry()
const oceanPosition = oceanGeometry.getAttribute('position') as THREE.BufferAttribute
const oceanBasePositions = Float32Array.from(oceanPosition.array as ArrayLike<number>)
const oceanMaterial = new THREE.MeshPhysicalMaterial({
  color: '#0f7fa4',
  map: createProceduralTexture('water', '#0f7fa4'),
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
const pressedCameraKeys = new Set<string>()
const cameraForward = new THREE.Vector3()
const cameraRight = new THREE.Vector3()
const cameraMove = new THREE.Vector3()
const cameraOffset = new THREE.Vector3()
const worldUp = new THREE.Vector3(0, 1, 0)

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
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase()
  if (event.metaKey || event.ctrlKey || !['a', 's', 'd', 'w', 'q', 'e'].includes(key)) {
    return
  }

  event.preventDefault()
  pressedCameraKeys.add(key)
})
window.addEventListener('keyup', (event) => {
  pressedCameraKeys.delete(event.key.toLowerCase())
})

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
  updateKeyboardCamera(delta)
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

function updateKeyboardCamera(delta: number) {
  if (pressedCameraKeys.size === 0) {
    return
  }

  camera.getWorldDirection(cameraForward)
  cameraForward.y = 0
  if (cameraForward.lengthSq() < 0.0001) {
    cameraForward.set(0, 0, -1)
  } else {
    cameraForward.normalize()
  }

  cameraRight.crossVectors(cameraForward, worldUp).normalize()
  cameraMove.set(0, 0, 0)

  if (pressedCameraKeys.has('w')) {
    cameraMove.add(cameraForward)
  }
  if (pressedCameraKeys.has('s')) {
    cameraMove.sub(cameraForward)
  }
  if (pressedCameraKeys.has('d')) {
    cameraMove.add(cameraRight)
  }
  if (pressedCameraKeys.has('a')) {
    cameraMove.sub(cameraRight)
  }

  if (cameraMove.lengthSq() > 0) {
    const panSpeed = Math.max(14, camera.position.distanceTo(controls.target) * 0.42) * delta
    cameraMove.normalize().multiplyScalar(panSpeed)
    camera.position.add(cameraMove)
    controls.target.add(cameraMove)
  }

  const rotationDirection = (pressedCameraKeys.has('q') ? 1 : 0) - (pressedCameraKeys.has('e') ? 1 : 0)
  if (rotationDirection !== 0) {
    const angle = rotationDirection * delta * 1.25
    cameraOffset.copy(camera.position).sub(controls.target).applyAxisAngle(worldUp, angle)
    camera.position.copy(controls.target).add(cameraOffset)
    camera.lookAt(controls.target)
  }
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
        urbanization * 14 +
        mechanization * 12 +
        containerAge * 10,
    ),
    2,
    72,
  )
  const stormPenalty = 1 - state.storminess * 0.0045
  const stockPenalty = 0.55 + state.fishStock / 180
  const catchIndex = clamp(
    Math.round(fleet * (0.22 + urbanization * 0.2 + mechanization * 0.92) * stormPenalty * stockPenalty),
    1,
    140,
  )
  const coastalExposure = clamp(
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

  return { buildout, catchIndex, coastalExposure, fleet }
}

function createOceanGeometry() {
  const vertices: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const minX = -150
  const maxX = 150
  const minZ = -128
  const maxZ = 34
  const step = 2.4

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
  moveShapeTo(landShape, -126, 62)
  lineShapeTo(landShape, -126, 9)
  bezierShapeTo(landShape, -110, 6, -100, 1, -92, -2)
  bezierShapeTo(landShape, -76, -5, -61, -13, -45, -9)
  bezierShapeTo(landShape, -34, -2.8, -24, -0.4, -16, -8)
  bezierShapeTo(landShape, -8, -16, 4, -14, 16, -7)
  bezierShapeTo(landShape, 30, -1.2, 44, 3, 59, 10.5)
  bezierShapeTo(landShape, 78, 18, 99, 24, 124, 28)
  lineShapeTo(landShape, 128, 64)
  lineShapeTo(landShape, -126, 62)

  const landGeometry = new THREE.ShapeGeometry(landShape, 18)
  landGeometry.rotateX(-Math.PI / 2)
  const land = new THREE.Mesh(
    landGeometry,
    makeMaterial('#6f8d52', 0.92, 'grass', 0),
  )
  land.position.y = 0.08
  land.receiveShadow = true
  terrainGroup.add(land)

  addShoreSandBands()

  addHill(-86, 34, 16, 6.1, '#4f713f')
  addHill(-65, 47, 12, 4.8, '#5a7b46')
  addHill(-34, 31, 10, 4.2, '#4f713f')
  addHill(-23, 39, 7, 2.8, '#5a7b46')
  addHill(31, 38, 11, 4.7, '#557844')
  addHill(42, 28, 7, 3.1, '#466a39')
  addHill(74, 41, 15, 5.8, '#557844')
  addHill(98, 33, 10, 3.9, '#466a39')

  const treeSites = [
    [-102, 18, 1.15],
    [-94, 28, 0.9],
    [-82, 42, 1.3],
    [-72, 29, 0.8],
    [-58, 38, 1.05],
    [-48, 25, 0.9],
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
    [54, 31, 1.1],
    [68, 38, 0.95],
    [84, 32, 1.25],
    [101, 40, 0.82],
  ] as const

  for (const [x, z, scale] of treeSites) {
    terrainGroup.add(createTree(x, z, scale))
  }
}

function addShoreSandBands() {
  const bands = [
    [-108, -82, 2.2, 0.45, '#c7ad75'],
    [-63, -42, 1.6, 0.35, '#d1b982'],
    [-23, 14, 2.4, 0.5, '#d6bd82'],
    [18, 43, 1.8, 0.4, '#cdb57d'],
    [62, 94, 2.1, 0.45, '#d5c08b'],
  ] as const

  for (const [startX, endX, landWidth, waterWidth, color] of bands) {
    terrainGroup.add(createShoreBand(startX, endX, landWidth, waterWidth, color))
  }
}

function createShoreBand(startX: number, endX: number, landWidth: number, waterWidth: number, color: string) {
  const steps = 16
  const landEdge: [number, number][] = []
  const waterEdge: [number, number][] = []

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps
    const x = THREE.MathUtils.lerp(startX, endX, t)
    const shoreline = shorelineZ(x)
    const ripple = Math.sin(t * Math.PI * 3 + startX * 0.04) * 0.35
    landEdge.push([x, shoreline + landWidth + ripple])
    waterEdge.push([x, shoreline - waterWidth + ripple * 0.25])
  }

  const shape = new THREE.Shape()
  moveShapeTo(shape, landEdge[0][0], landEdge[0][1])
  for (const [x, z] of landEdge.slice(1)) {
    lineShapeTo(shape, x, z)
  }
  for (const [x, z] of [...waterEdge].reverse()) {
    lineShapeTo(shape, x, z)
  }
  lineShapeTo(shape, landEdge[0][0], landEdge[0][1])

  const material = makeMaterial(color, 0.88, 'sand', 0)
  material.side = THREE.DoubleSide
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape, 12), material)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = 0.13
  mesh.receiveShadow = true
  return mesh
}

function rebuildHarbor() {
  clearGroup(harborGroup)
  windTurbines.length = 0

  const oceanLevel = getOceanLevel()
  addShorelineFoam(oceanLevel)

  const pierLength = clamp(9 + smoothstep(state.year, MIN_YEAR, MAX_YEAR) * 36 + state.industry * 0.11, 9, 52)
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
    harborGroup.add(createPier(28, -8.8, pierLength * 0.5, 1.25, 0.32, '#8b6444'))
  }

  if (state.year >= 1880) {
    addQuay(-31, -8.3, 30, 2.6, -0.32, '#9da1a1')
    addQuay(31, -8.6, 32, 2.6, 0.32, '#9da1a1')
    addHarborCrane(-22, -6.1, 0.95)
    addHarborCrane(18, -6.4, 1.05)
    addHarborCrane(38, -7.6, 0.92)
  }

  if (state.year >= 1930) {
    addQuay(4, -15.4, 46, 3.4, 0.02, '#a7a9a8')
    addHarborCrane(3, -12.5, 1.18)
    addHarborCrane(-9, -13.2, 1.05)
  }

  if (state.year >= 1965 && state.industry > 42) {
    addContainerTerminal()
  }

  if (state.year >= 1985 && state.industry > 70) {
    harborGroup.add(createWindTurbine(-64, -28, 1.1))
    harborGroup.add(createWindTurbine(63, -30, 0.95))
  }

  if (state.year >= 1970 && state.tourism > 34) {
    const slipCount = Math.round(3 + state.tourism / 14)
    for (let i = 0; i < slipCount; i += 1) {
      const x = 9 + i * 2.25
      harborGroup.add(createPier(x, -10.5, 7.5, 0.48, 0.03, '#c7ad80'))
      if (i % 2 === 0) {
        harborGroup.add(createPier(-34 + i * 2.2, -11.8, 8.2, 0.48, -0.18, '#c7ad80'))
      }
    }
  }

  addHarborBasinDetails(oceanLevel)

  if (calculateMetrics().coastalExposure > 57 || (state.year >= 1965 && state.seaLevel > 55)) {
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
    addRoad(-12, 9.2, 78, 1.15, -0.04)
  }
  if (state.year >= 900) {
    addRoad(4, 15.2, 118, 0.95, 0.02)
    addRoad(-38, 20.2, 1, 30, 0.04)
    addRoad(34, 20.8, 1, 28, -0.05)
  }
  if (state.year >= 1880) {
    addRoad(4, 1.5, 72, 1.05, 0.07)
    addRoad(-54, 26.4, 1.05, 31, 0.08)
    addRoad(58, 27.4, 1.05, 30, -0.06)
  }
  if (state.year >= 1930) {
    addRoad(2, 24.2, 148, 1.45, -0.03)
    addRoad(-30, 13, 1.1, 39, 0.03)
    addRoad(30, 14, 1.1, 38, -0.06)
    addRoad(0, 38.5, 132, 1.2, 0.01)
  }

  addDryingRacks()
  addHarborProps()

  const cottageCount = clamp(
    Math.round(3 + state.population / 13 + smoothstep(state.year, -500, 1750) * 11),
    state.year < 0 ? 3 : 6,
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
    const vehicleCount = clamp(Math.round((state.population + state.industry) / 18), 5, 24)
    for (let i = 0; i < vehicleCount; i += 1) {
      const vehicle = createVehicle(-62 + i * 5.2, 3 + (i % 2) * 2.2, i % 2 ? '#f59e0b' : '#2563eb')
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
  const boatCount = clamp(Math.round(fleet * 0.94), state.year < 0 ? 5 : 8, 52)
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
    [-51, -28.7, 0.28],
    [49, -29.4, -0.24],
    [-62, -38.4, 0.18],
    [61, -40.6, -0.2],
    [-43, -48.6, 0.3],
    [42, -51.2, -0.26],
    [-12, -44.1, 0.08],
    [15, -46.5, -0.1],
    [-72, -21.6, 0.38],
    [72, -24.4, -0.34],
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

  const fishCount = clamp(Math.round(state.fishStock / 5), 2, 20)
  fishGlints.visible = state.fishStock > 18
  fishGlints.children.forEach((fish, index) => {
    fish.visible = index < fishCount
  })

  enableShadows(boatGroup)
}

function rebuildAtmosphere() {
  clearGroup(atmosphereGroup)
  gulls.length = 0
  lightningBolts.length = 0
  rainLines = null
  whitecapLines = null

  const cloudCount = clamp(Math.round(8 + state.storminess / 7), 8, 24)
  for (let i = 0; i < cloudCount; i += 1) {
    const cloud = createCloud(
      -82 + i * (164 / cloudCount) + pseudo(i) * 7,
      20 + pseudo(i + 3) * 9,
      -46 + pseudo(i + 6) * 34,
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

  if (state.storminess > 42) {
    whitecapLines = createWhitecaps()
    atmosphereGroup.add(whitecapLines)
  }

  if (state.storminess > 54) {
    atmosphereGroup.add(createStormShelfCloud())
  }

  if (state.storminess > 64) {
    for (let i = 0; i < 3; i += 1) {
      const bolt = createLightningBolt(-34 + i * 28 + pseudo(i) * 8, -20 - pseudo(i + 4) * 18, 18 + pseudo(i + 8) * 9)
      lightningBolts.push(bolt)
      atmosphereGroup.add(bolt)
    }
  }
}

function updateLighting() {
  const storm = state.storminess / 100
  const modern = smoothstep(state.year, 1965, 1990)
  const ancientWarmth = 1 - smoothstep(state.year, -500, 1750)
  skyColor.setHSL(0.56 - ancientWarmth * 0.04, 0.66 - storm * 0.26, 0.66 - storm * 0.34)
  scene.background = skyColor
  scene.fog = new THREE.Fog(skyColor.clone(), 82 - storm * 10, 255 - storm * 38)
  hemiLight.intensity = 1.28 - storm * 0.18 + modern * 0.12
  sunLight.intensity = 3.5 - storm * 1.45
  fillLight.intensity = 0.88 + storm * 0.42
  oceanMaterial.color.setHSL(0.54, 0.72 - storm * 0.18, 0.39 - storm * 0.17)
  oceanMaterial.roughness = 0.16 + storm * 0.42
  bloomPass.strength = 0.2 + modern * 0.12 + (1 - storm) * 0.03
  renderer.toneMappingExposure = 1.12 - storm * 0.1
}

function animateOcean(elapsed: number) {
  const storm = state.storminess / 100
  const waveAmp = 0.16 + storm * 0.96
  const oceanLevel = getOceanLevel()

  for (let i = 0; i < oceanPosition.count; i += 1) {
    const x = oceanBasePositions[i * 3]
    const z = oceanBasePositions[i * 3 + 2]
    const y =
      oceanLevel +
      Math.sin(x * 0.16 + elapsed * (0.85 + storm)) * waveAmp * 0.44 +
      Math.cos(z * 0.18 + elapsed * (1.1 + storm * 1.4)) * waveAmp * 0.28 +
      Math.sin((x + z) * 0.07 + elapsed * 0.42) * waveAmp * 0.18 +
      Math.sin(x * 0.58 + z * 0.34 + elapsed * (2.4 + storm * 2.1)) * waveAmp * storm * 0.12
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
    const span = 132
    const speed = 0.15 + (index % 4) * 0.025
    const progress = (elapsed * speed + index * 0.17) % 1
    vehicle.position.x = -66 + progress * span
    vehicle.position.z = 3 + (index % 2) * 2.2 + Math.sin(elapsed * 0.6 + index) * 0.15
    vehicle.rotation.y = Math.PI / 2
  }
}

function animateAtmosphere(elapsed: number, delta: number) {
  const storm = state.storminess / 100
  for (const cloud of atmosphereGroup.children) {
    if (cloud.userData.speed) {
      cloud.position.x += (cloud.userData.speed as number) * delta * (1 + state.storminess / 80)
      if (cloud.position.x > 92) {
        cloud.position.x = -92
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
    rainLines.position.y -= delta * (22 + state.storminess * 0.2)
    rainLines.position.x += delta * (1.2 + storm * 5.5)
    if (rainLines.position.y < -10) {
      rainLines.position.y = 18
      rainLines.position.x = 0
    }
  }

  if (whitecapLines) {
    whitecapLines.position.y = getOceanLevel() + 0.14 + Math.sin(elapsed * 2.8) * 0.05
    whitecapLines.position.x = Math.sin(elapsed * 0.35) * 1.2
  }

  const flashPulse =
    state.storminess > 64
      ? Math.max(0, Math.sin(elapsed * 1.7 + 1.2)) ** 38 + Math.max(0, Math.sin(elapsed * 0.53 + 4.8)) ** 80
      : 0
  const flash = flashPulse > 0.015 ? clamp(flashPulse * state.storminess * 0.12, 0, 8) : 0
  lightningLight.intensity = flash
  for (const bolt of lightningBolts) {
    bolt.visible = flash > 0.35 && pseudo(Math.floor(elapsed * 2) + bolt.id) > 0.22
    const material = bolt.material
    if (material instanceof THREE.LineBasicMaterial) {
      material.opacity = clamp(flash / 6, 0, 0.95)
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
      makeMaterial(definition.color, 0.86, 'wood'),
    )
    base.position.y = definition.h / 2
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(definition.w * 0.62, definition.h * 0.85, 10),
      makeMaterial(definition.roof, 0.92, 'roof'),
    )
    roof.position.y = definition.h + definition.h * 0.36
    group.add(base, roof)
    addHutDetails(group, definition)
    return group
  }

  const wallStyle = getBuildingMaterialStyle(definition)
  const body = box(definition.w, definition.h, definition.d, definition.color, 0, definition.h / 2, 0, wallStyle)
  const foundationStyle = definition.kind === 'cottage' || definition.kind === 'market' || definition.kind === 'hotel' ? 'stone' : 'concrete'
  group.add(box(definition.w + 0.36, 0.28, definition.d + 0.36, '#6b6f68', 0, 0.13, 0, foundationStyle, 0.86), body)

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
    group.add(box(definition.w + 0.35, 0.34, definition.d + 0.35, definition.roof, 0, definition.h + 0.17, 0, 'roof', 0.68))
  } else {
    const roof = createGableRoof(definition.w + 0.55, definition.d + 0.62, 0.9, definition.roof)
    roof.position.y = definition.h
    group.add(roof)
  }

  addBuildingTrim(group, definition, hasFlatRoof)
  addWindows(group, definition)
  group.add(box(0.58, 0.92, 0.08, '#3d281d', 0, 0.58, -definition.d / 2 - 0.055, 'wood', 0.76))

  if (definition.kind === 'chapel' || definition.kind === 'temple') {
    group.add(box(1.05, 2.6, 1, definition.color, 0, definition.h + 1.25, -definition.d * 0.34, wallStyle))
    const steeple = new THREE.Mesh(
      new THREE.ConeGeometry(0.72, definition.kind === 'temple' ? 0.9 : 1.45, definition.kind === 'temple' ? 6 : 4),
      makeMaterial(definition.kind === 'temple' ? '#a16207' : '#4b5460', 0.82, 'roof'),
    )
    steeple.position.set(0, definition.h + 3.25, -definition.d * 0.34)
    steeple.rotation.y = Math.PI / 4
    group.add(steeple)
  }

  if (definition.kind === 'fort') {
    for (const xOffset of [-definition.w / 2 + 0.42, definition.w / 2 - 0.42]) {
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.48, 0.56, definition.h * 1.18, 12),
        makeMaterial(definition.color, 0.88, 'stone'),
      )
      tower.position.set(xOffset, (definition.h * 1.18) / 2, -definition.d / 2 + 0.35)
      group.add(tower)
    }
  }

  if (definition.kind === 'industrial') {
    const stackHeight = definition.h + 2.5
    const stack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.44, stackHeight, 14),
      makeMaterial('#3f332d', 0.88, 'stone'),
    )
    stack.position.set(definition.w * 0.34, stackHeight / 2, definition.d * 0.16)
    group.add(stack)

    if (state.year >= 1880 && state.industry > 28) {
      addSmokePuffs(group, stack.position.x, stackHeight + 0.8, stack.position.z)
    }

    group.add(box(definition.w * 0.78, 0.12, 0.14, '#f1f5d8', 0, definition.h * 0.58, -definition.d / 2 - 0.07, 'metal', 0.42))
    addIndustrialDetails(group, definition)
  }

  if (definition.kind === 'market') {
    group.add(box(definition.w * 0.82, 0.34, 0.12, '#fef3c7', 0, definition.h * 0.72, -definition.d / 2 - 0.09, 'wood', 0.62))
    addAwning(group, definition.w, definition.d, '#e11d48')
  }

  if (definition.kind === 'hotel') {
    group.add(box(definition.w * 0.68, 0.2, 0.16, '#fff7ed', 0, definition.h * 0.3, -definition.d / 2 - 0.1, 'metal', 0.4))
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
    addModernBuildingDetails(group, definition)
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 2.1, 8), makeMaterial('#cbd5e1', 0.35, 'metal', 0.2))
    antenna.position.set(definition.w * 0.25, definition.h + 1.2, definition.d * 0.2)
    group.add(antenna)
  }

  return group
}

function getBuildingMaterialStyle(definition: BuildingDefinition): MaterialStyle {
  if (definition.kind === 'industrial' || definition.kind === 'warehouse' || definition.kind === 'port') {
    return state.year >= 1880 ? 'concrete' : 'stone'
  }
  if (definition.kind === 'fort' || definition.kind === 'chapel' || definition.kind === 'temple') {
    return 'stone'
  }
  if (definition.kind === 'office' || definition.kind === 'highrise' || definition.kind === 'research') {
    return 'glass'
  }
  if (definition.kind === 'apartment') {
    return 'plaster'
  }
  return state.year < 900 ? 'wood' : 'plaster'
}

function addHutDetails(group: THREE.Group, definition: BuildingDefinition) {
  group.add(box(0.5, 0.76, 0.08, '#4a2f1b', 0, 0.46, -definition.w * 0.43, 'wood', 0.8))
  for (let band = 0; band < 3; band += 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(definition.w * (0.42 + band * 0.025), 0.025, 6, 18),
      makeMaterial('#d5b174', 0.85, 'wood'),
    )
    ring.position.y = 0.42 + band * 0.38
    ring.rotation.x = Math.PI / 2
    group.add(ring)
  }
  for (let rib = 0; rib < 8; rib += 1) {
    const angle = (rib / 8) * Math.PI * 2
    const post = box(
      0.045,
      definition.h * 0.86,
      0.045,
      '#6b4423',
      Math.cos(angle) * definition.w * 0.45,
      definition.h * 0.46,
      Math.sin(angle) * definition.w * 0.45,
      'wood',
      0.86,
    )
    post.rotation.y = angle
    group.add(post)
  }
}

function addBuildingTrim(group: THREE.Group, definition: BuildingDefinition, hasFlatRoof: boolean) {
  const trimColor =
    definition.kind === 'office' || definition.kind === 'highrise'
      ? '#dbeafe'
      : definition.kind === 'industrial' || definition.kind === 'warehouse'
        ? '#475569'
        : '#f8e6c2'
  const trimStyle: MaterialStyle = definition.kind === 'office' || definition.kind === 'highrise' ? 'metal' : 'wood'

  group.add(box(definition.w + 0.18, 0.12, 0.14, trimColor, 0, 0.42, -definition.d / 2 - 0.08, trimStyle, 0.55))
  if (hasFlatRoof) {
    group.add(box(definition.w + 0.55, 0.16, 0.18, trimColor, 0, definition.h + 0.48, -definition.d / 2 - 0.1, trimStyle, 0.5))
    group.add(box(0.18, 0.16, definition.d + 0.55, trimColor, -definition.w / 2 - 0.1, definition.h + 0.48, 0, trimStyle, 0.5))
    group.add(box(0.18, 0.16, definition.d + 0.55, trimColor, definition.w / 2 + 0.1, definition.h + 0.48, 0, trimStyle, 0.5))
  } else {
    const ridge = box(0.16, 0.18, definition.d + 0.72, trimColor, 0, definition.h + 0.9, 0, trimStyle, 0.55)
    ridge.rotation.z = Math.PI / 4
    group.add(ridge)
    if (definition.kind === 'cottage' || definition.kind === 'hotel' || definition.kind === 'market') {
      group.add(box(0.42, 1.05, 0.42, '#5b3a24', definition.w * 0.24, definition.h + 0.54, definition.d * 0.12, 'stone', 0.78))
    }
  }

  if (definition.kind === 'cottage' || definition.kind === 'market' || definition.kind === 'hotel') {
    const planterColor = definition.kind === 'market' ? '#16a34a' : '#2f6f3e'
    group.add(box(0.82, 0.22, 0.22, planterColor, -definition.w * 0.32, 0.42, -definition.d / 2 - 0.14, 'wood', 0.78))
    group.add(box(0.82, 0.22, 0.22, planterColor, definition.w * 0.32, 0.42, -definition.d / 2 - 0.14, 'wood', 0.78))
  }
}

function addIndustrialDetails(group: THREE.Group, definition: BuildingDefinition) {
  group.add(box(definition.w * 0.42, 0.72, 0.16, '#334155', -definition.w * 0.24, 0.64, -definition.d / 2 - 0.12, 'metal', 0.42))
  group.add(box(definition.w * 0.56, 0.16, 0.72, '#64748b', -definition.w * 0.12, 0.28, -definition.d / 2 - 0.42, 'metal', 0.48))
  for (let vent = 0; vent < 3; vent += 1) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.32, 12), makeMaterial('#94a3b8', 0.45, 'metal', 0.18))
    cap.position.set(-definition.w * 0.28 + vent * 0.7, definition.h + 0.58, definition.d * 0.12)
    group.add(cap)
  }
  for (let pipe = 0; pipe < 2; pipe += 1) {
    const pipeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, definition.h * 0.8, 8), makeMaterial('#475569', 0.5, 'metal', 0.22))
    pipeMesh.position.set(-definition.w / 2 - 0.08, definition.h * 0.44, -definition.d * 0.2 + pipe * definition.d * 0.32)
    group.add(pipeMesh)
  }
}

function addModernBuildingDetails(group: THREE.Group, definition: BuildingDefinition) {
  const roofY = definition.h + 0.72
  group.add(box(definition.w * 0.36, 0.45, definition.d * 0.28, '#cbd5e1', -definition.w * 0.18, roofY, 0, 'metal', 0.38))
  group.add(box(definition.w * 0.22, 0.3, definition.d * 0.2, '#64748b', definition.w * 0.24, roofY - 0.06, definition.d * 0.18, 'metal', 0.4))
  const balconyRows = Math.min(5, Math.floor(definition.h / 2.2))
  for (let row = 0; row < balconyRows; row += 1) {
    const y = 1.45 + row * 1.55
    group.add(box(definition.w * 0.78, 0.08, 0.26, '#dbeafe', 0, y, -definition.d / 2 - 0.18, 'metal', 0.34))
  }
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
    map: createProceduralTexture('glass', '#9bdcf4'),
    emissive: '#ffb84d',
    emissiveIntensity: 0.18 + state.storminess / 350,
    roughness: 0.35,
  })
  const frameMaterial = makeMaterial('#1f2937', 0.52, 'metal', 0.12)
  const sideColumns = Math.max(2, Math.floor(definition.d / 1.25))

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
      group.add(createWindowFrame(0.52, 0.58, frameMaterial, x, y, -definition.d / 2 - 0.075, false))

      if (definition.kind === 'highrise' || definition.kind === 'office') {
        const z = -definition.d * 0.32 + (column % sideColumns) * ((definition.d * 0.64) / Math.max(1, sideColumns - 1))
        const sideWindow = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.42, 0.42), windowMaterial)
        sideWindow.position.set(definition.w / 2 + 0.045, y, z)
        group.add(sideWindow)
      }
    }
  }
}

function createWindowFrame(
  width: number,
  height: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  sideways: boolean,
) {
  const frame = new THREE.Group()
  const horizontalGeometry = sideways ? new THREE.BoxGeometry(0.04, 0.045, width) : new THREE.BoxGeometry(width, 0.045, 0.04)
  const verticalGeometry = sideways ? new THREE.BoxGeometry(0.04, height, 0.045) : new THREE.BoxGeometry(0.045, height, 0.04)
  const top = new THREE.Mesh(horizontalGeometry, material)
  const bottom = new THREE.Mesh(horizontalGeometry, material)
  const left = new THREE.Mesh(verticalGeometry, material)
  const right = new THREE.Mesh(verticalGeometry, material)
  top.position.y = height / 2
  bottom.position.y = -height / 2
  if (sideways) {
    left.position.z = -width / 2
    right.position.z = width / 2
  } else {
    left.position.x = -width / 2
    right.position.x = width / 2
  }
  frame.position.set(x, y, z)
  frame.add(top, bottom, left, right)
  return frame
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
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * scale, 0.065 * scale, 3.2 * scale, 8), makeMaterial('#3d281d', 0.7, 'wood'))
  mast.position.set(0, 1.75 * scale, zOffset)
  group.add(mast)

  if (rig === 'square') {
    const sail = new THREE.Mesh(
      new THREE.PlaneGeometry(1.55 * scale, 1.45 * scale),
      new THREE.MeshStandardMaterial({
        color: sailColor,
        map: createProceduralTexture('sail', sailColor),
        roughness: 0.88,
        side: THREE.DoubleSide,
      }),
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

  const hull = new THREE.Mesh(createHullGeometry(1.65 * scale, 0.75 * scale, 4.3 * scale), makeMaterial(hullColor, 0.56, 'hull'))
  hull.position.y = 0.25 * scale
  group.add(hull)

  if (type === 'dugout') {
    group.add(box(0.1 * scale, 0.08 * scale, 4.2 * scale, '#3d281d', -0.52 * scale, 0.65 * scale, 0, 'wood', 0.8))
    group.add(box(0.1 * scale, 0.08 * scale, 4.2 * scale, '#3d281d', 0.52 * scale, 0.65 * scale, 0, 'wood', 0.8))
  } else if (type === 'galley') {
    addMastAndSail(group, scale, '#f7e7bd', 'square')
    for (let oar = 0; oar < 8; oar += 1) {
      const left = box(0.08 * scale, 0.04 * scale, 1.7 * scale, '#5b3a24', -0.86 * scale, 0.55 * scale, -1.6 * scale + oar * 0.45 * scale, 'wood', 0.78)
      const right = box(0.08 * scale, 0.04 * scale, 1.7 * scale, '#5b3a24', 0.86 * scale, 0.55 * scale, -1.6 * scale + oar * 0.45 * scale, 'wood', 0.78)
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
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 3.1 * scale, 8), makeMaterial('#4b3427', 0.7, 'wood'))
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
    group.add(box((type === 'factory' || type === 'container' ? 1.55 : 1.05) * scale, 0.8 * scale, 1.05 * scale, cabinColor, 0, 0.88 * scale, -0.38 * scale, 'metal', 0.38))

    if (type !== 'yacht' && type !== 'ferry') {
      const boom = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 3.4 * scale), makeMaterial('#2f2a24', 0.7, 'metal'))
      boom.position.set(0.72 * scale, 1.32 * scale, 0.56 * scale)
      boom.rotation.x = -0.35
      group.add(boom)
      group.add(box(0.95 * scale, 0.08 * scale, 1.55 * scale, '#64748b', -0.75 * scale, 0.82 * scale, 0.65 * scale, 'metal', 0.46))
    }

    if (type === 'factory' || type === 'container') {
      for (let c = 0; c < 7; c += 1) {
        group.add(box(0.62 * scale, 0.34 * scale, 0.48 * scale, colors[(index + c + 2) % colors.length], -1.2 * scale + c * 0.4 * scale, 1.12 * scale, 0.62 * scale, 'metal', 0.48))
      }
    }

    if (type === 'ferry') {
      group.add(box(1.4 * scale, 0.35 * scale, 2.8 * scale, '#dbeafe', 0, 1.32 * scale, 0.15 * scale, 'glass', 0.28))
      group.add(box(1.55 * scale, 0.14 * scale, 3.15 * scale, '#1e3a8a', 0, 0.82 * scale, 0.15 * scale, 'metal', 0.42))
    }
  }

  if (type === 'steamer' || type === 'factory' || type === 'ferry') {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.95 * scale, 10), makeMaterial('#2f2a24', 0.65, 'metal'))
    stack.position.set(0.45 * scale, 1.35 * scale, -0.62 * scale)
    group.add(stack)
  }

  addBoatDetailing(group, type, scale, index, hullColor)
  return group
}

function addBoatDetailing(group: THREE.Group, type: BoatType, scale: number, index: number, hullColor: string) {
  const deckLength = type === 'factory' || type === 'container' ? 5.8 : type === 'ferry' ? 4.9 : 3.35
  const deckWidth = type === 'factory' || type === 'container' ? 1.85 : type === 'ferry' ? 1.6 : 1.18
  group.add(box(deckWidth * scale, 0.08 * scale, deckLength * scale, '#b98b5f', 0, 0.74 * scale, -0.08 * scale, 'wood', 0.74))
  group.add(box(deckWidth * scale, 0.08 * scale, 0.16 * scale, hullColor, 0, 0.86 * scale, -deckLength * 0.48 * scale, 'hull', 0.52))

  for (const side of [-1, 1]) {
    group.add(box(0.055 * scale, 0.16 * scale, deckLength * 0.78 * scale, '#f8fafc', side * deckWidth * 0.53 * scale, 1.0 * scale, -0.1 * scale, 'metal', 0.36))
    for (let post = 0; post < 4; post += 1) {
      group.add(
        box(
          0.055 * scale,
          0.36 * scale,
          0.055 * scale,
          '#cbd5e1',
          side * deckWidth * 0.53 * scale,
          0.88 * scale,
          (-deckLength * 0.35 + post * deckLength * 0.23) * scale,
          'metal',
          0.38,
        ),
      )
    }
  }

  if (type !== 'dugout' && type !== 'galley' && type !== 'cog' && type !== 'caravel' && type !== 'lugger' && type !== 'schooner' && type !== 'sail') {
    for (let pane = 0; pane < 3; pane += 1) {
      group.add(box(0.22 * scale, 0.22 * scale, 0.035 * scale, '#9bdcf4', (-0.32 + pane * 0.32) * scale, 1.05 * scale, -0.92 * scale, 'glass', 0.2))
    }
  }

  if (type === 'trawler' || type === 'steamer' || type === 'factory') {
    const reel = new THREE.Mesh(new THREE.TorusGeometry(0.34 * scale, 0.045 * scale, 8, 18), makeMaterial('#7c4a2d', 0.72, 'wood'))
    reel.position.set(-0.58 * scale, 1.02 * scale, 0.72 * scale)
    reel.rotation.y = Math.PI / 2
    group.add(reel)
    group.add(box(1.05 * scale, 0.035 * scale, 0.62 * scale, '#1f2937', -0.72 * scale, 0.98 * scale, 0.9 * scale, 'rubber', 0.78))
  }

  if (type === 'container' || type === 'factory') {
    group.add(box(0.13 * scale, 1.08 * scale, 0.13 * scale, '#fbbf24', 1.02 * scale, 1.64 * scale, 0.25 * scale, 'metal', 0.34))
    const boom = box(2.2 * scale, 0.09 * scale, 0.09 * scale, '#f59e0b', 0.22 * scale, 2.15 * scale, 0.25 * scale, 'metal', 0.34)
    boom.rotation.z = -0.18
    group.add(boom)
  }

  if (type === 'cog' || type === 'caravel' || type === 'lugger' || type === 'schooner' || type === 'sail' || type === 'galley') {
    const riggingGeometry = new THREE.BufferGeometry()
    riggingGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        [
          0,
          2.95 * scale,
          0,
          -0.72 * scale,
          0.82 * scale,
          -1.72 * scale,
          0,
          2.95 * scale,
          0,
          0.72 * scale,
          0.82 * scale,
          1.62 * scale,
          0,
          2.5 * scale,
          0,
          0,
          0.82 * scale,
          -1.92 * scale,
        ],
        3,
      ),
    )
    group.add(
      new THREE.LineSegments(
        riggingGeometry,
        new THREE.LineBasicMaterial({
          color: '#2f241f',
          transparent: true,
          opacity: 0.72,
        }),
      ),
    )
  }

  if (index % 3 === 0) {
    group.add(box(0.54 * scale, 0.22 * scale, 0.28 * scale, '#fef3c7', -0.4 * scale, 0.9 * scale, 0.2 * scale, 'wood', 0.68))
  }
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
  group.add(box(width, 0.25, length, color, 0, 0.36, -length / 2, 'wood', 0.72))

  for (let plank = 1; plank < length; plank += 1.35) {
    group.add(box(width + 0.12, 0.035, 0.055, '#d1a36f', 0, 0.51, -plank, 'wood', 0.78))
  }

  const postMaterial = makeMaterial('#4b3427', 0.7, 'wood')
  for (let i = 0; i < Math.floor(length / 2.4); i += 1) {
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.25, 8), postMaterial)
      post.position.set((width / 2 - 0.12) * side, -0.12, -1.2 - i * 2.35)
      group.add(post)

      if (i % 2 === 0) {
        group.add(createCleat((width / 2 + 0.12) * side, 0.62, -1.2 - i * 2.35, side < 0))
      }
    }
  }

  return group
}

function addQuay(x: number, z: number, width: number, depth: number, rotation: number, color: string) {
  const quay = box(width, 0.72, depth, color, x, 0.28, z, 'concrete', 0.82)
  quay.rotation.y = rotation
  harborGroup.add(quay)
  addQuayFurniture(x, z, width, depth, rotation)
}

function addQuayFurniture(x: number, z: number, width: number, depth: number, rotation: number) {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  group.rotation.y = rotation

  const bollardCount = clamp(Math.floor(width / 4), 3, 12)
  for (let i = 0; i < bollardCount; i += 1) {
    const localX = -width / 2 + 1.4 + i * ((width - 2.8) / Math.max(1, bollardCount - 1))
    group.add(createBollard(localX, 0.84, -depth / 2 - 0.18))
    group.add(box(0.22, 0.76, 0.28, '#111827', localX, 0.28, -depth / 2 - 0.44, 'rubber', 0.82))
  }

  group.add(box(width * 0.92, 0.035, 0.08, '#fef3c7', 0, 0.78, -depth / 2 - 0.04, 'metal', 0.44))
  harborGroup.add(group)
}

function createBollard(x: number, y: number, z: number) {
  const group = new THREE.Group()
  group.position.set(x, y, z)
  const material = makeMaterial('#111827', 0.5, 'metal', 0.24)
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.38, 12), material)
  post.position.y = 0.16
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.1, 12), material)
  cap.position.y = 0.4
  group.add(post, cap)
  return group
}

function createCleat(x: number, y: number, z: number, flip: boolean) {
  const group = new THREE.Group()
  group.position.set(x, y, z)
  group.rotation.y = flip ? Math.PI : 0
  group.add(box(0.42, 0.08, 0.12, '#111827', 0, 0.06, 0, 'metal', 0.45))
  group.add(box(0.1, 0.12, 0.22, '#111827', -0.16, 0.1, 0, 'metal', 0.45))
  group.add(box(0.1, 0.12, 0.22, '#111827', 0.16, 0.1, 0, 'metal', 0.45))
  return group
}

function addHarborBasinDetails(oceanLevel: number) {
  addNavigationBuoys(oceanLevel)
  addSlipways()

  if (state.year >= 900) {
    harborGroup.add(createBreakwater(-55, -7.8, 34, 2.4, -0.62, '#ef4444'))
    harborGroup.add(createBreakwater(55, -10.2, 38, 2.4, 0.55, '#22c55e'))
  }

  if (state.year >= 1750) {
    addMooringDolphins(oceanLevel)
  }

  if (state.year >= 1880) {
    addHarborServiceYard()
  }
}

function addNavigationBuoys(oceanLevel: number) {
  const buoys = [
    [-7, -22, '#ef4444'],
    [7, -23.5, '#22c55e'],
    [-12, -39, '#ef4444'],
    [13, -41, '#22c55e'],
    [-24, -54, '#f59e0b'],
    [25, -57, '#f59e0b'],
  ] as const

  for (const [x, z, color] of buoys) {
    harborGroup.add(createBuoy(x, z, color, oceanLevel))
  }
}

function createBuoy(x: number, z: number, color: string, oceanLevel: number) {
  const group = new THREE.Group()
  group.position.set(x, oceanLevel + 0.08, z)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.72, 12), makeMaterial(color, 0.46, 'metal', 0.12))
  body.position.y = 0.28
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.42, 12), makeMaterial('#f8fafc', 0.48, 'metal', 0.08))
  top.position.y = 0.88
  const anchor = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.02, 0), new THREE.Vector3(0, -1.25, 0)]),
    new THREE.LineBasicMaterial({ color: '#1f2937', transparent: true, opacity: 0.45 }),
  )
  group.add(body, top, anchor)
  return group
}

function createBreakwater(x: number, z: number, length: number, width: number, rotation: number, beaconColor: string) {
  const group = new THREE.Group()
  group.position.set(x, 0, z)
  group.rotation.y = rotation
  group.add(box(width, 0.62, length, '#7b8176', 0, 0.36, -length / 2, 'stone', 0.92))
  group.add(box(width * 0.42, 0.18, length * 0.92, '#4b5563', 0, 0.78, -length / 2, 'concrete', 0.82))

  for (let i = 0; i < Math.floor(length / 2); i += 1) {
    for (const side of [-1, 1]) {
      const rock = box(
        0.7 + pseudo(i + side * 4) * 0.55,
        0.38 + pseudo(i + 11) * 0.28,
        0.62 + pseudo(i + 19) * 0.56,
        '#626b60',
        side * (width * 0.62 + pseudo(i + 3) * 0.55),
        0.26,
        -1.2 - i * 1.9,
        'stone',
        0.96,
      )
      rock.rotation.y = pseudo(i + 8) * Math.PI
      group.add(rock)
    }
  }

  group.add(createHarborBeacon(0, 1.02, -length + 1.2, beaconColor))
  return group
}

function createHarborBeacon(x: number, y: number, z: number, color: string) {
  const group = new THREE.Group()
  group.position.set(x, y, z)
  group.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.15, 12), makeMaterial('#f8fafc', 0.5, 'metal', 0.08)))
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 10), makeMaterial(color, 0.22, 'glass', 0.04))
  lamp.position.y = 0.72
  group.add(lamp)
  const light = new THREE.PointLight(color, 0.55, 14, 1.6)
  light.position.y = 0.72
  group.add(light)
  return group
}

function addSlipways() {
  const slips = [
    [-17, -4.9, 4.2, 8.8, -0.18],
    [18, -5.2, 4.8, 9.6, 0.16],
    [-42, -7.2, 3.6, 7.8, -0.34],
  ] as const

  for (const [x, z, width, length, rotation] of slips) {
    const group = new THREE.Group()
    group.position.set(x, 0.08, z)
    group.rotation.y = rotation
    const ramp = box(width, 0.16, length, '#9a8f7f', 0, 0.17, -length / 2, 'concrete', 0.86)
    ramp.rotation.x = -0.05
    group.add(ramp)
    group.add(box(0.12, 0.18, length * 0.92, '#475569', -width * 0.35, 0.34, -length / 2, 'metal', 0.45))
    group.add(box(0.12, 0.18, length * 0.92, '#475569', width * 0.35, 0.34, -length / 2, 'metal', 0.45))
    harborGroup.add(group)
  }
}

function addMooringDolphins(oceanLevel: number) {
  const sites = [
    [-28, -13],
    [-3, -18],
    [24, -13.5],
    [44, -18],
    [-48, -18.5],
  ] as const

  for (const [x, z] of sites) {
    const group = new THREE.Group()
    group.position.set(x, oceanLevel - 0.06, z)
    for (const offset of [-0.34, 0, 0.34]) {
      const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.1, 10), makeMaterial('#4b3427', 0.78, 'wood'))
      pile.position.set(offset, 0.82, Math.abs(offset) * 0.6)
      pile.rotation.z = offset * 0.08
      group.add(pile)
    }
    group.add(box(1.1, 0.18, 0.24, '#4b3427', 0, 1.88, 0.2, 'wood', 0.78))
    harborGroup.add(group)
  }
}

function addHarborServiceYard() {
  for (let i = 0; i < 8; i += 1) {
    const rack = new THREE.Group()
    rack.position.set(-47 + i * 4.2, 0.26, -4.8 + (i % 2) * 1.6)
    rack.rotation.y = -0.2
    rack.add(box(1.9, 0.08, 0.08, '#334155', 0, 0.9, 0, 'metal', 0.44))
    rack.add(box(0.08, 1.2, 0.08, '#334155', -0.82, 0.6, 0, 'metal', 0.44))
    rack.add(box(0.08, 1.2, 0.08, '#334155', 0.82, 0.6, 0, 'metal', 0.44))
    const net = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.055, 8, 18), makeMaterial('#0f766e', 0.72, 'rubber'))
    net.position.y = 0.45
    net.rotation.x = Math.PI / 2
    rack.add(net)
    harborGroup.add(rack)
  }

  for (let i = 0; i < 10; i += 1) {
    const pallet = box(1.3, 0.22, 0.86, '#7c4a2d', 24 + (i % 5) * 2.1, 0.62, -4.6 - Math.floor(i / 5) * 1.1, 'wood', 0.78)
    harborGroup.add(pallet)
  }
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
    const wall = box(Math.hypot(x2 - x1, z2 - z1), 0.55, 0.34, '#7c8178', (x1 + x2) / 2, 0.42, (z1 + z2) / 2 + 0.2, 'stone', 0.86)
    wall.rotation.y = Math.atan2(z2 - z1, x2 - x1)
    harborGroup.add(wall)
  }
}

function addHarborCrane(x: number, z: number, scale: number) {
  const group = new THREE.Group()
  group.position.set(x, 0.42, z)
  group.add(box(0.42 * scale, 4.2 * scale, 0.42 * scale, '#f59e0b', 0, 2.1 * scale, 0, 'metal', 0.36))
  const boom = box(5.8 * scale, 0.22 * scale, 0.22 * scale, '#fbbf24', 2.7 * scale, 4.15 * scale, 0, 'metal', 0.36)
  boom.rotation.z = 0.14
  group.add(boom)
  group.add(box(0.16 * scale, 1.2 * scale, 0.16 * scale, '#111827', 5.1 * scale, 3.45 * scale, 0, 'metal', 0.44))
  harborGroup.add(group)
}

function addContainerTerminal() {
  addQuay(38, -19.2, 45, 5.2, 0.02, '#9ca3af')
  for (let i = 0; i < 64; i += 1) {
    const row = Math.floor(i / 12)
    const color = ['#dc2626', '#2563eb', '#f97316', '#16a34a', '#eab308'][i % 5]
    const container = box(1.75, 0.7, 0.82, color, 20 + (i % 12) * 2.15, 0.92 + (i % 3 === 0 ? 0.72 : 0), -21.4 - row * 1.15, 'metal', 0.48)
    harborGroup.add(container)
  }
  addHarborCrane(21, -15.8, 1.3)
  addHarborCrane(34, -16.1, 1.45)
  addHarborCrane(47, -16.4, 1.25)
  addHarborCrane(59, -16.7, 1.18)
}

function addFloodBoards(oceanLevel: number) {
  const color = oceanLevel > 1.1 ? '#d97706' : '#f59e0b'
  for (let i = 0; i < 9; i += 1) {
    const board = box(2.1, 0.34, 0.32, color, -13 + i * 3.4, 0.72, -1.35, 'wood', 0.7)
    board.rotation.y = 0.02
    harborGroup.add(board)
  }
}

function addRoad(x: number, z: number, width: number, depth: number, rotation: number) {
  const road = box(width, 0.05, depth, '#756b5a', x, 0.19, z, 'road', 0.88)
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
    group.add(box(1.7, 0.08, 0.08, '#5b4636', 0, 1.2, 0, 'wood', 0.78))
    for (const side of [-0.7, 0.7]) {
      group.add(box(0.08, 1.15, 0.08, '#5b4636', side, 0.68, 0, 'wood', 0.78))
    }
    for (let strip = 0; strip < 4; strip += 1) {
      group.add(box(0.18, 0.76, 0.035, '#e8d5a9', -0.55 + strip * 0.36, 0.72, -0.04, 'sail', 0.88))
    }
    townGroup.add(group)
  }
}

function addHarborProps() {
  const crateCount = state.year < 900 ? 8 : state.year < 1880 ? 16 : 28
  for (let i = 0; i < crateCount; i += 1) {
    const x = -34 + (i % 14) * 5.1 + pseudo(i) * 0.5
    const z = -1.3 + Math.floor(i / 14) * 2.2 + pseudo(i + 4) * 0.4
    const color = i % 4 === 0 ? '#7c4a2d' : i % 4 === 1 ? '#a16207' : i % 4 === 2 ? '#475569' : '#b45309'
    townGroup.add(box(0.92, 0.52, 0.72, color, x, 0.48, z, i % 4 === 2 ? 'metal' : 'wood', 0.74))
  }

  const barrelCount = state.year >= 1750 ? 14 : 6
  for (let i = 0; i < barrelCount; i += 1) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.62, 12), makeMaterial('#7c4a2d', 0.76, 'wood'))
    barrel.position.set(-22 + i * 2.4, 0.52, 2.2 + (i % 2) * 1.4)
    barrel.rotation.z = i % 3 === 0 ? Math.PI / 2 : 0
    townGroup.add(barrel)
  }

  if (state.year >= 1970 && state.tourism > 30) {
    for (let i = 0; i < 9; i += 1) {
      const stall = new THREE.Group()
      stall.position.set(-46 + i * 5.4, 0.18, 7.8 + (i % 2) * 1.4)
      stall.rotation.y = -0.08
      stall.add(box(1.9, 0.12, 1.2, '#f8fafc', 0, 1.4, 0, 'sail', 0.72))
      stall.add(box(1.65, 0.72, 0.9, ['#ef4444', '#14b8a6', '#f59e0b'][i % 3], 0, 0.52, 0, 'wood', 0.72))
      townGroup.add(stall)
    }
  }

  if (state.year >= 1930) {
    for (let i = 0; i < 12; i += 1) {
      const lamp = new THREE.Group()
      lamp.position.set(-58 + i * 10.5, 0.18, 12.4 + (i % 2) * 2.2)
      lamp.add(box(0.08, 2.1, 0.08, '#1f2937', 0, 1.05, 0, 'metal', 0.4))
      lamp.add(box(0.42, 0.18, 0.42, '#fde68a', 0, 2.18, 0, 'glass', 0.22))
      townGroup.add(lamp)
    }
  }
}

function addUrbanGrowth() {
  const growth = clamp(
    Math.round(
      smoothstep(state.year, 200, 1990) * 22 +
        smoothstep(state.year, 900, 1990) * 42 +
        smoothstep(state.year, 1750, 1990) * 38 +
        smoothstep(state.year, 1930, 1990) * 46 +
        state.population * 0.32,
    ),
    0,
    160,
  )

  const districts = [
    { x: -56, z: 13, columns: 8, rows: 4, spacingX: 5.0, spacingZ: 4.1 },
    { x: -12, z: 14, columns: 9, rows: 4, spacingX: 4.9, spacingZ: 4.0 },
    { x: 34, z: 16, columns: 8, rows: 4, spacingX: 5.0, spacingZ: 4.2 },
    { x: -72, z: 31, columns: 10, rows: 3, spacingX: 5.3, spacingZ: 4.3 },
    { x: -16, z: 31, columns: 11, rows: 3, spacingX: 5.1, spacingZ: 4.2 },
    { x: 42, z: 34, columns: 9, rows: 3, spacingX: 5.3, spacingZ: 4.3 },
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
        if (isWaterPoint(x, z) || z < shorelineZ(x) + 2.2) {
          seed += 1
          continue
        }

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
      makeMaterial(i === 1 ? '#b91c1c' : '#cbd5e1', 0.4, 'metal', 0.18),
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
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.22 * scale, 7.5 * scale, 16), makeMaterial('#e2e8f0', 0.38, 'metal', 0.16))
  tower.position.y = 3.75 * scale
  group.add(tower)

  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.34 * scale, 16, 12), makeMaterial('#f8fafc', 0.35, 'metal', 0.16))
  hub.position.set(0, 7.72 * scale, 0)
  group.add(hub)

  const blades = new THREE.Group()
  blades.position.copy(hub.position)
  for (let i = 0; i < 3; i += 1) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 2.45 * scale, 0.05 * scale), makeMaterial('#f8fafc', 0.42, 'metal', 0.12))
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
  group.add(box(1.35, 0.42, 0.72, color, 0, 0.28, 0, 'metal', 0.42))
  group.add(box(0.72, 0.34, 0.58, '#bfdbfe', -0.08, 0.66, -0.02, 'glass', 0.28))
  for (const xOffset of [-0.43, 0.43]) {
    for (const zOffset of [-0.3, 0.3]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.08, 12), makeMaterial('#111827', 0.55, 'rubber'))
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
    color: new THREE.Color().setHSL(0.6, 0.18, 0.92 - storm * 0.5),
    roughness: 0.9,
    transparent: true,
    opacity: 0.72 + storm * 0.12,
  })

  for (let i = 0; i < 5; i += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry((0.8 + pseudo(i) * 0.55) * scale, 16, 12), material)
    puff.position.set((i - 2) * 0.88 * scale, pseudo(i + 5) * 0.45 * scale, pseudo(i + 9) * 0.38 * scale)
    if (storm > 0.55) {
      puff.scale.y = 0.68
    }
    group.add(puff)
  }

  if (storm > 0.62) {
    group.add(box(4.1 * scale, 0.16 * scale, 1.1 * scale, '#263142', 0, -0.38 * scale, 0, 'plaster', 0.95))
  }

  return group
}

function createStormShelfCloud() {
  const group = new THREE.Group()
  group.position.set(-10, 14.5, -24)
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#263142'),
    roughness: 0.96,
    transparent: true,
    opacity: 0.82,
  })

  for (let i = 0; i < 16; i += 1) {
    const cloud = new THREE.Mesh(new THREE.SphereGeometry(2.2 + pseudo(i) * 1.4, 18, 10), material)
    cloud.position.set(-44 + i * 6.2, pseudo(i + 2) * 1.5, -4 + pseudo(i + 6) * 8)
    cloud.scale.set(1.55, 0.42, 0.82)
    group.add(cloud)
  }

  group.userData.speed = 0.08
  return group
}

function createLightningBolt(x: number, z: number, height: number) {
  const vertices: number[] = []
  let currentX = x
  let currentZ = z
  let currentY = height

  for (let i = 0; i < 7; i += 1) {
    const nextX = currentX + (pseudo(i + x) - 0.5) * 5.4
    const nextZ = currentZ + (pseudo(i + z) - 0.5) * 3.6
    const nextY = height - ((i + 1) / 7) * (height - 2.4)
    vertices.push(currentX, currentY, currentZ, nextX, nextY, nextZ)
    if (i === 3) {
      vertices.push(nextX, nextY, nextZ, nextX + 3.4, nextY - 2.2, nextZ + 1.6)
    }
    currentX = nextX
    currentY = nextY
    currentZ = nextZ
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  const bolt = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color: '#e0f2fe',
      transparent: true,
      opacity: 0,
    }),
  )
  bolt.visible = false
  return bolt
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
  const count = 320 + Math.round(state.storminess * 2.2)
  const vertices: number[] = []
  for (let i = 0; i < count; i += 1) {
    const x = -88 + pseudo(i) * 176
    const y = -2 + pseudo(i + 5) * 34
    const z = -72 + pseudo(i + 9) * 98
    vertices.push(x, y, z, x + 0.9 + state.storminess * 0.018, y - 2.1, z + 0.08)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  return new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color: '#d7ecff',
      transparent: true,
      opacity: 0.36 + state.storminess / 260,
    }),
  )
}

function createWhitecaps() {
  const vertices: number[] = []
  const count = 90 + Math.round(state.storminess * 0.9)
  for (let i = 0; i < count; i += 1) {
    const x = -74 + pseudo(i + 2) * 148
    const z = -72 + pseudo(i + 5) * 58
    if (!isWaterPoint(x, z)) {
      continue
    }
    const width = 0.8 + pseudo(i + 7) * 1.8
    vertices.push(x, 0, z, x + width, 0, z + 0.18 + pseudo(i + 12) * 0.35)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  return new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({
      color: '#f8feff',
      transparent: true,
      opacity: clamp(state.storminess / 170, 0.24, 0.64),
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

  for (let i = 0; i < 22; i += 1) {
    const fish = new THREE.Mesh(new THREE.CircleGeometry(0.22 + pseudo(i) * 0.16, 12), material)
    fish.position.set(-56 + pseudo(i + 1) * 112, getOceanLevel() + 0.1, -42 + pseudo(i + 2) * 28)
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
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * scale, 0.17 * scale, 0.9 * scale, 8), makeMaterial('#6b4423', 0.85, 'wood'))
  trunk.position.y = 0.45 * scale
  group.add(trunk)

  const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.72 * scale, 1.8 * scale, 9), makeMaterial('#244f2d', 0.92, 'grass'))
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

function box(
  width: number,
  height: number,
  depth: number,
  color: string,
  x: number,
  y: number,
  z: number,
  style: MaterialStyle = 'plaster',
  roughness = 0.72,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), makeMaterial(color, roughness, style))
  mesh.position.set(x, y, z)
  return mesh
}

function makeMaterial(color: string, roughness: number, style: MaterialStyle = 'plaster', metalness = 0.03) {
  return new THREE.MeshStandardMaterial({
    color,
    map: createProceduralTexture(style, color),
    roughness,
    metalness,
  })
}

function createProceduralTexture(style: MaterialStyle, color: string) {
  const key = `${style}:${color}`
  const cached = textureCache.get(key)
  if (cached) {
    return cached
  }

  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Expected canvas texture context to exist.')
  }

  context.fillStyle = color
  context.fillRect(0, 0, size, size)

  if (style === 'wood' || style === 'hull') {
    drawWoodTexture(context, size, color, style === 'hull')
  } else if (style === 'stone' || style === 'concrete') {
    drawBlockTexture(context, size, color, style === 'concrete')
  } else if (style === 'roof') {
    drawRoofTexture(context, size, color)
  } else if (style === 'grass') {
    drawGrassTexture(context, size, color)
  } else if (style === 'sand') {
    drawSpeckledTexture(context, size, color, 90, 0.2)
  } else if (style === 'road') {
    drawRoadTexture(context, size, color)
  } else if (style === 'water') {
    drawWaterTexture(context, size, color)
  } else if (style === 'metal') {
    drawMetalTexture(context, size, color)
  } else if (style === 'sail') {
    drawSailTexture(context, size, color)
  } else if (style === 'glass') {
    drawGlassTexture(context, size, color)
  } else {
    drawSpeckledTexture(context, size, color, 60, 0.14)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(style === 'water' || style === 'grass' ? 8 : 2.5, style === 'water' || style === 'grass' ? 8 : 2.5)
  textureCache.set(key, texture)
  return texture
}

function drawWoodTexture(context: CanvasRenderingContext2D, size: number, color: string, painted: boolean) {
  drawSpeckledTexture(context, size, color, 34, painted ? 0.1 : 0.18)
  for (let y = 8; y < size; y += 18) {
    context.fillStyle = colorVariant(color, -0.18, painted ? 0.22 : 0.34)
    context.fillRect(0, y, size, 2)
  }
  for (let x = 10; x < size; x += 22) {
    context.fillStyle = colorVariant(color, -0.25, painted ? 0.18 : 0.28)
    context.fillRect(x, 0, 2, size)
  }
  for (let i = 0; i < 18; i += 1) {
    const y = Math.floor(pseudo(i + color.length) * size)
    context.strokeStyle = colorVariant(color, i % 2 ? -0.2 : 0.16, painted ? 0.22 : 0.32)
    context.beginPath()
    context.moveTo(0, y)
    context.bezierCurveTo(size * 0.22, y - 8, size * 0.72, y + 11, size, y - 3)
    context.stroke()
  }
}

function drawBlockTexture(context: CanvasRenderingContext2D, size: number, color: string, smoother: boolean) {
  drawSpeckledTexture(context, size, color, smoother ? 32 : 68, smoother ? 0.1 : 0.18)
  const course = smoother ? 22 : 18
  context.strokeStyle = colorVariant(color, -0.24, smoother ? 0.22 : 0.34)
  context.lineWidth = 2
  for (let y = course; y < size; y += course) {
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(size, y)
    context.stroke()
  }
  for (let y = 0; y < size; y += course) {
    const offset = (Math.floor(y / course) % 2) * course * 0.55
    for (let x = offset; x < size; x += course * 1.1) {
      context.beginPath()
      context.moveTo(x, y)
      context.lineTo(x, y + course)
      context.stroke()
    }
  }
}

function drawRoofTexture(context: CanvasRenderingContext2D, size: number, color: string) {
  drawSpeckledTexture(context, size, color, 48, 0.12)
  for (let y = 0; y < size; y += 16) {
    context.strokeStyle = colorVariant(color, -0.28, 0.34)
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(size, y)
    context.stroke()
    for (let x = -8; x < size; x += 16) {
      context.beginPath()
      context.arc(x + ((y / 16) % 2) * 8, y + 12, 8, Math.PI, 0)
      context.stroke()
    }
  }
}

function drawGrassTexture(context: CanvasRenderingContext2D, size: number, color: string) {
  drawSpeckledTexture(context, size, color, 160, 0.2)
  for (let i = 0; i < 80; i += 1) {
    const x = pseudo(i + 12) * size
    const y = pseudo(i + 22) * size
    context.fillStyle = colorVariant(color, i % 2 ? -0.18 : 0.18, 0.18)
    context.fillRect(x, y, 9 + pseudo(i) * 18, 2)
  }
}

function drawRoadTexture(context: CanvasRenderingContext2D, size: number, color: string) {
  drawSpeckledTexture(context, size, color, 95, 0.22)
  context.strokeStyle = colorVariant(color, 0.25, 0.18)
  context.lineWidth = 3
  for (let y = 18; y < size; y += 34) {
    context.setLineDash([12, 12])
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(size, y)
    context.stroke()
  }
  context.setLineDash([])
}

function drawWaterTexture(context: CanvasRenderingContext2D, size: number, color: string) {
  drawSpeckledTexture(context, size, color, 55, 0.1)
  for (let y = 8; y < size; y += 12) {
    context.strokeStyle = colorVariant(color, y % 3 ? 0.32 : -0.12, 0.28)
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(0, y)
    for (let x = 0; x <= size; x += 16) {
      context.quadraticCurveTo(x + 8, y + Math.sin(x * 0.22 + y) * 4, x + 16, y)
    }
    context.stroke()
  }
}

function drawMetalTexture(context: CanvasRenderingContext2D, size: number, color: string) {
  drawSpeckledTexture(context, size, color, 36, 0.12)
  for (let x = 0; x < size; x += 18) {
    context.fillStyle = colorVariant(color, x % 2 ? -0.16 : 0.22, 0.22)
    context.fillRect(x, 0, 3, size)
  }
}

function drawSailTexture(context: CanvasRenderingContext2D, size: number, color: string) {
  drawSpeckledTexture(context, size, color, 70, 0.08)
  context.strokeStyle = colorVariant(color, -0.18, 0.32)
  context.lineWidth = 2
  for (let x = 18; x < size; x += 24) {
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x + 10, size)
    context.stroke()
  }
  for (let y = 24; y < size; y += 28) {
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(size, y + 4)
    context.stroke()
  }
}

function drawGlassTexture(context: CanvasRenderingContext2D, size: number, color: string) {
  context.fillStyle = colorVariant(color, 0.25, 0.7)
  context.fillRect(0, 0, size, size)
  context.fillStyle = 'rgba(255, 255, 255, 0.34)'
  context.fillRect(16, 0, 10, size)
  context.fillRect(68, 0, 6, size)
  context.strokeStyle = 'rgba(15, 23, 42, 0.32)'
  context.lineWidth = 2
  for (let x = 0; x < size; x += 32) {
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, size)
    context.stroke()
  }
}

function drawSpeckledTexture(
  context: CanvasRenderingContext2D,
  size: number,
  color: string,
  count: number,
  opacity: number,
) {
  for (let i = 0; i < count; i += 1) {
    const shade = i % 2 === 0 ? 0.24 : -0.22
    context.fillStyle = colorVariant(color, shade, opacity * (0.45 + pseudo(i + size) * 0.55))
    context.fillRect(pseudo(i + 1) * size, pseudo(i + 3) * size, 1 + pseudo(i + 5) * 3, 1 + pseudo(i + 7) * 3)
  }
}

function colorVariant(color: string, amount: number, alpha: number) {
  const next = new THREE.Color(color)
  next.lerp(new THREE.Color(amount >= 0 ? '#ffffff' : '#000000'), Math.abs(amount))
  return `rgba(${Math.round(next.r * 255)}, ${Math.round(next.g * 255)}, ${Math.round(next.b * 255)}, ${alpha})`
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
  return new THREE.Mesh(geometry, makeMaterial(color, 0.68, 'roof'))
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
      map: createProceduralTexture('sail', color),
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
    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
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
