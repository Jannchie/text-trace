import { createTextTrace } from '@text-trace/core';
import type { TextTraceDramaMode, TextTraceFontKey } from '@text-trace/core';
import './styles.css';

const DEFAULT_TEXT = 'Hello, world!';
const URL_PARAMS = {
  text: 'text',
  fontKey: 'font',
  dramaMode: 'drama',
  horizontalDelay: 'horizontalDelay',
  guideDelay: 'guideDelay',
  strokeDelay: 'strokeDelay',
  fillDelay: 'fillDelay',
  eraseDelay: 'eraseDelay',
  verticalOvershoot: 'verticalOvershoot',
  verticalProbability: 'verticalProbability',
  guideExitExtension: 'guideExitExtension',
  mergeOverlappingShapes: 'mergeOverlappingShapes'
};

const svg = readElement('trace-stage', SVGSVGElement);
const textInput = readElement('text-input', HTMLInputElement);
const fontSelect = readElement('font-select', HTMLSelectElement);
const dramaSelect = readElement('drama-select', HTMLSelectElement);
const horizontalDelayInput = readElement('horizontal-delay-input', HTMLInputElement);
const guideDelayInput = readElement('guide-delay-input', HTMLInputElement);
const strokeDelayInput = readElement('stroke-delay-input', HTMLInputElement);
const fillDelayInput = readElement('fill-delay-input', HTMLInputElement);
const eraseDelayInput = readElement('erase-delay-input', HTMLInputElement);
const verticalOvershootInput = readElement('vertical-overshoot-input', HTMLInputElement);
const verticalProbabilityInput = readElement('vertical-probability-input', HTMLInputElement);
const guideExitExtensionInput = readElement('guide-exit-extension-input', HTMLInputElement);
const mergeOverlapsInput = readElement('merge-overlaps-input', HTMLInputElement);
const replayButton = readElement('replay-button', HTMLButtonElement);
const phaseReadout = readElement('phase-readout', HTMLParagraphElement);

restoreFromUrl();

const trace = createTextTrace(svg, {
  onPhaseChange: (phase) => {
    phaseReadout.textContent = phase || 'Idle';
  }
});

function render() {
  writeUrl();

  void trace.update({
    text: textInput.value || DEFAULT_TEXT,
    fontKey: fontSelect.value as TextTraceFontKey,
    dramaMode: dramaSelect.value as TextTraceDramaMode,
    timing: {
      horizontalDelay: readDelay(horizontalDelayInput),
      guideDelay: readDelay(guideDelayInput),
      circleDelay: readDelay(guideDelayInput) + 50,
      strokeDelay: readDelay(strokeDelayInput),
      fillDelay: readDelay(fillDelayInput),
      eraseDelay: readDelay(eraseDelayInput),
      horizontalEraseDelay: readDelay(eraseDelayInput)
    },
    verticalGuideOvershoot: readDelay(verticalOvershootInput),
    verticalGuideProbability: readProbability(verticalProbabilityInput),
    guideExitExtension: readDelay(guideExitExtensionInput),
    mergeOverlappingShapes: mergeOverlapsInput.checked,
    onPhaseChange: (phase) => {
      phaseReadout.textContent = phase || 'Idle';
    }
  });
}

textInput.addEventListener('input', render);
fontSelect.addEventListener('change', render);
dramaSelect.addEventListener('change', render);
horizontalDelayInput.addEventListener('input', render);
guideDelayInput.addEventListener('input', render);
strokeDelayInput.addEventListener('input', render);
fillDelayInput.addEventListener('input', render);
eraseDelayInput.addEventListener('input', render);
verticalOvershootInput.addEventListener('input', render);
verticalProbabilityInput.addEventListener('input', render);
guideExitExtensionInput.addEventListener('input', render);
mergeOverlapsInput.addEventListener('change', render);
replayButton.addEventListener('click', render);

render();

function restoreFromUrl(): void {
  const params = new URLSearchParams(window.location.search);

  const text = params.get(URL_PARAMS.text);
  if (text !== null) textInput.value = text;

  setSelectFromUrl(fontSelect, params.get(URL_PARAMS.fontKey));
  setSelectFromUrl(dramaSelect, params.get(URL_PARAMS.dramaMode));
  setInputFromUrl(horizontalDelayInput, params.get(URL_PARAMS.horizontalDelay));
  setInputFromUrl(guideDelayInput, params.get(URL_PARAMS.guideDelay));
  setInputFromUrl(strokeDelayInput, params.get(URL_PARAMS.strokeDelay));
  setInputFromUrl(fillDelayInput, params.get(URL_PARAMS.fillDelay));
  setInputFromUrl(eraseDelayInput, params.get(URL_PARAMS.eraseDelay));
  setInputFromUrl(verticalOvershootInput, params.get(URL_PARAMS.verticalOvershoot));
  setInputFromUrl(verticalProbabilityInput, params.get(URL_PARAMS.verticalProbability));
  setInputFromUrl(guideExitExtensionInput, params.get(URL_PARAMS.guideExitExtension));
  setCheckboxFromUrl(mergeOverlapsInput, params.get(URL_PARAMS.mergeOverlappingShapes));
}

function writeUrl(): void {
  const params = new URLSearchParams();
  params.set(URL_PARAMS.text, textInput.value || DEFAULT_TEXT);
  params.set(URL_PARAMS.fontKey, fontSelect.value);
  params.set(URL_PARAMS.dramaMode, dramaSelect.value);
  params.set(URL_PARAMS.horizontalDelay, String(readDelay(horizontalDelayInput)));
  params.set(URL_PARAMS.guideDelay, String(readDelay(guideDelayInput)));
  params.set(URL_PARAMS.strokeDelay, String(readDelay(strokeDelayInput)));
  params.set(URL_PARAMS.fillDelay, String(readDelay(fillDelayInput)));
  params.set(URL_PARAMS.eraseDelay, String(readDelay(eraseDelayInput)));
  params.set(URL_PARAMS.verticalOvershoot, String(readDelay(verticalOvershootInput)));
  params.set(URL_PARAMS.verticalProbability, String(readProbability(verticalProbabilityInput)));
  params.set(URL_PARAMS.guideExitExtension, String(readDelay(guideExitExtensionInput)));
  params.set(URL_PARAMS.mergeOverlappingShapes, String(mergeOverlapsInput.checked));

  window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}${window.location.hash}`);
}

function setSelectFromUrl(select: HTMLSelectElement, value: string | null): void {
  if (value === null) return;
  const hasOption = Array.from(select.options).some((option) => option.value === value);
  if (hasOption) select.value = value;
}

function setInputFromUrl(input: HTMLInputElement, value: string | null): void {
  if (value !== null && value !== '') input.value = value;
}

function setCheckboxFromUrl(input: HTMLInputElement, value: string | null): void {
  if (value !== null) input.checked = value === 'true';
}

function readDelay(input: HTMLInputElement): number {
  const value = Number(input.value);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function readProbability(input: HTMLInputElement): number {
  const value = Number(input.value);
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

function readElement<T extends Element>(
  id: string,
  constructor: new (...args: never[]) => T
): T {
  const element = document.getElementById(id);
  if (!(element instanceof constructor)) {
    throw new Error(`Missing #${id}`);
  }
  return element;
}
