/**
 * The bundled default repository.
 *
 * KiCad ships a well-known default repository URL; the equivalent here is a
 * repository compiled into the app so the Plugin and Content Manager has real,
 * installable content out of the box (and works with no network). Third-party
 * repositories can still be added by URL — see `pcmStore.addRepository`.
 *
 * The colour themes are complete `Theme` objects (built by overriding the KiCad
 * default palette). The library packages carry small, real `.kicad_sym`
 * libraries, read by the same parser as any other symbol library.
 */

import { KICAD_DEFAULT, type Theme } from '../editors/schematic/theme.js';
import type { Repository, RepoPackage } from './types.js';

// ---- colour themes -----------------------------------------------------------
// Each theme overrides the KiCad-default palette so every Theme key stays
// populated; only the colours that define the look are listed here.

const NORD: Theme = {
  ...KICAD_DEFAULT,
  background: 'rgb(46, 52, 64)',
  grid: 'rgb(76, 86, 106)',
  wire: 'rgb(163, 190, 140)',
  bus: 'rgb(180, 142, 173)',
  busJunction: 'rgb(180, 142, 173)',
  junction: 'rgb(163, 190, 140)',
  symbolOutline: 'rgb(136, 192, 208)',
  symbolFill: 'rgb(59, 66, 82)',
  pin: 'rgb(136, 192, 208)',
  pinName: 'rgb(143, 188, 187)',
  pinNumber: 'rgb(235, 203, 139)',
  reference: 'rgb(143, 188, 187)',
  value: 'rgb(216, 222, 233)',
  fields: 'rgb(180, 142, 173)',
  label: 'rgb(236, 239, 244)',
  globalLabel: 'rgb(191, 97, 106)',
  hierLabel: 'rgb(208, 135, 112)',
  noteLine: 'rgb(129, 161, 193)',
  noText: 'rgb(129, 161, 193)',
  noConnect: 'rgb(180, 142, 173)',
  sheetBorder: 'rgb(136, 192, 208)',
  sheetName: 'rgb(143, 188, 187)',
  sheetFile: 'rgb(208, 135, 112)',
  pageFrame: 'rgb(136, 192, 208)',
  cursor: 'rgb(236, 239, 244)',
};

const SOLARIZED_DARK: Theme = {
  ...KICAD_DEFAULT,
  background: 'rgb(0, 43, 54)',
  grid: 'rgb(88, 110, 117)',
  wire: 'rgb(133, 153, 0)',
  bus: 'rgb(38, 139, 210)',
  busJunction: 'rgb(38, 139, 210)',
  junction: 'rgb(133, 153, 0)',
  symbolOutline: 'rgb(203, 75, 22)',
  symbolFill: 'rgb(7, 54, 66)',
  pin: 'rgb(203, 75, 22)',
  pinName: 'rgb(42, 161, 152)',
  pinNumber: 'rgb(181, 137, 0)',
  reference: 'rgb(42, 161, 152)',
  value: 'rgb(147, 161, 161)',
  fields: 'rgb(211, 54, 130)',
  label: 'rgb(238, 232, 213)',
  globalLabel: 'rgb(220, 50, 47)',
  hierLabel: 'rgb(181, 137, 0)',
  noteLine: 'rgb(38, 139, 210)',
  noText: 'rgb(38, 139, 210)',
  noConnect: 'rgb(38, 139, 210)',
  sheetBorder: 'rgb(203, 75, 22)',
  sheetName: 'rgb(42, 161, 152)',
  sheetFile: 'rgb(181, 137, 0)',
  pageFrame: 'rgb(203, 75, 22)',
  cursor: 'rgb(238, 232, 213)',
};

const SOLARIZED_LIGHT: Theme = {
  ...KICAD_DEFAULT,
  background: 'rgb(253, 246, 227)',
  grid: 'rgb(147, 161, 161)',
  wire: 'rgb(133, 153, 0)',
  bus: 'rgb(38, 139, 210)',
  busJunction: 'rgb(38, 139, 210)',
  junction: 'rgb(133, 153, 0)',
  symbolOutline: 'rgb(203, 75, 22)',
  symbolFill: 'rgb(238, 232, 213)',
  pin: 'rgb(203, 75, 22)',
  pinName: 'rgb(42, 161, 152)',
  pinNumber: 'rgb(181, 137, 0)',
  reference: 'rgb(42, 161, 152)',
  value: 'rgb(88, 110, 117)',
  fields: 'rgb(211, 54, 130)',
  label: 'rgb(7, 54, 66)',
  globalLabel: 'rgb(220, 50, 47)',
  hierLabel: 'rgb(181, 137, 0)',
  noteLine: 'rgb(38, 139, 210)',
  noText: 'rgb(38, 139, 210)',
  noConnect: 'rgb(38, 139, 210)',
  sheetBorder: 'rgb(203, 75, 22)',
  sheetName: 'rgb(42, 161, 152)',
  sheetFile: 'rgb(181, 137, 0)',
  pageFrame: 'rgb(203, 75, 22)',
  cursor: 'rgb(7, 54, 66)',
};

const HIGH_CONTRAST: Theme = {
  ...KICAD_DEFAULT,
  background: 'rgb(0, 0, 0)',
  grid: 'rgb(80, 80, 80)',
  wire: 'rgb(0, 255, 0)',
  bus: 'rgb(0, 180, 255)',
  busJunction: 'rgb(0, 180, 255)',
  junction: 'rgb(0, 255, 0)',
  symbolOutline: 'rgb(255, 255, 255)',
  symbolFill: 'rgba(255, 255, 255, 0)',
  pin: 'rgb(255, 255, 255)',
  pinName: 'rgb(0, 255, 255)',
  pinNumber: 'rgb(255, 255, 0)',
  reference: 'rgb(0, 255, 255)',
  value: 'rgb(255, 255, 255)',
  fields: 'rgb(255, 0, 255)',
  label: 'rgb(255, 255, 255)',
  globalLabel: 'rgb(255, 80, 80)',
  hierLabel: 'rgb(255, 200, 0)',
  noteLine: 'rgb(0, 180, 255)',
  noText: 'rgb(0, 180, 255)',
  noConnect: 'rgb(0, 180, 255)',
  sheetBorder: 'rgb(255, 255, 255)',
  sheetName: 'rgb(0, 255, 255)',
  sheetFile: 'rgb(255, 200, 0)',
  pageFrame: 'rgb(255, 255, 255)',
  cursor: 'rgb(255, 255, 255)',
};

// ---- symbol libraries --------------------------------------------------------
// Small, real `.kicad_sym` libraries (KiCad 10 format), read by readSymbolLib.

const LIB_PASSIVES = `(kicad_symbol_lib
	(version 20251024)
	(generator "kicad_symbol_editor")
	(generator_version "10.0")
	(symbol "R"
		(pin_numbers (hide yes))
		(pin_names (offset 0))
		(exclude_from_sim no)
		(in_bom yes)
		(on_board yes)
		(property "Reference" "R" (at 2.032 0 90)
			(show_name no) (effects (font (size 1.27 1.27))))
		(property "Value" "R" (at 0 0 90)
			(show_name no) (effects (font (size 1.27 1.27))))
		(property "Footprint" "" (at -1.778 0 90)
			(show_name no) (hide yes) (effects (font (size 1.27 1.27))))
		(property "Datasheet" "" (at 0 0 0)
			(show_name no) (hide yes) (effects (font (size 1.27 1.27))))
		(property "Description" "Resistor" (at 0 0 0)
			(show_name no) (hide yes) (effects (font (size 1.27 1.27))))
		(symbol "R_0_1"
			(rectangle (start -1.016 -2.54) (end 1.016 2.54)
				(stroke (width 0.254) (type default)) (fill (type none))))
		(symbol "R_1_1"
			(pin passive line (at 0 3.81 270) (length 1.27)
				(name "" (effects (font (size 1.27 1.27))))
				(number "1" (effects (font (size 1.27 1.27)))))
			(pin passive line (at 0 -3.81 90) (length 1.27)
				(name "" (effects (font (size 1.27 1.27))))
				(number "2" (effects (font (size 1.27 1.27))))))
		(embedded_fonts no)
	)
	(symbol "C"
		(pin_numbers (hide yes))
		(pin_names (offset 0.254))
		(exclude_from_sim no)
		(in_bom yes)
		(on_board yes)
		(property "Reference" "C" (at 0.635 2.54 0)
			(effects (font (size 1.27 1.27)) (justify left)))
		(property "Value" "C" (at 0.635 -2.54 0)
			(effects (font (size 1.27 1.27)) (justify left)))
		(property "Footprint" "" (at 0.9652 -3.81 0)
			(show_name no) (hide yes) (effects (font (size 1.27 1.27)) (justify left)))
		(property "Datasheet" "" (at 0 0 0)
			(show_name no) (hide yes) (effects (font (size 1.27 1.27))))
		(property "Description" "Unpolarized capacitor" (at 0 0 0)
			(show_name no) (hide yes) (effects (font (size 1.27 1.27))))
		(symbol "C_0_1"
			(polyline (pts (xy -2.032 -0.762) (xy 2.032 -0.762))
				(stroke (width 0.508) (type default)) (fill (type none)))
			(polyline (pts (xy -2.032 0.762) (xy 2.032 0.762))
				(stroke (width 0.508) (type default)) (fill (type none))))
		(symbol "C_1_1"
			(pin passive line (at 0 3.81 270) (length 2.794)
				(name "~" (effects (font (size 1.27 1.27))))
				(number "1" (effects (font (size 1.27 1.27)))))
			(pin passive line (at 0 -3.81 90) (length 2.794)
				(name "~" (effects (font (size 1.27 1.27))))
				(number "2" (effects (font (size 1.27 1.27))))))
		(embedded_fonts no)
	)
	(symbol "L"
		(pin_numbers (hide yes))
		(pin_names (offset 1.016) (hide yes))
		(exclude_from_sim no)
		(in_bom yes)
		(on_board yes)
		(property "Reference" "L" (at -1.27 0 90)
			(effects (font (size 1.27 1.27))))
		(property "Value" "L" (at 1.905 0 90)
			(effects (font (size 1.27 1.27))))
		(property "Footprint" "" (at 0 0 0)
			(show_name no) (hide yes) (effects (font (size 1.27 1.27))))
		(property "Datasheet" "" (at 0 0 0)
			(show_name no) (hide yes) (effects (font (size 1.27 1.27))))
		(property "Description" "Inductor" (at 0 0 0)
			(show_name no) (hide yes) (effects (font (size 1.27 1.27))))
		(symbol "L_0_1"
			(arc (start 0 -2.54) (mid 0.6323 -1.905) (end 0 -1.27)
				(stroke (width 0) (type default)) (fill (type none)))
			(arc (start 0 -1.27) (mid 0.6323 -0.635) (end 0 0)
				(stroke (width 0) (type default)) (fill (type none)))
			(arc (start 0 0) (mid 0.6323 0.635) (end 0 1.27)
				(stroke (width 0) (type default)) (fill (type none)))
			(arc (start 0 1.27) (mid 0.6323 1.905) (end 0 2.54)
				(stroke (width 0) (type default)) (fill (type none))))
		(symbol "L_1_1"
			(pin passive line (at 0 3.81 270) (length 1.27)
				(name "1" (effects (font (size 1.27 1.27))))
				(number "1" (effects (font (size 1.27 1.27)))))
			(pin passive line (at 0 -3.81 90) (length 1.27)
				(name "2" (effects (font (size 1.27 1.27))))
				(number "2" (effects (font (size 1.27 1.27))))))
		(embedded_fonts no)
	)
)
`;

const LIB_LED = `(kicad_symbol_lib
	(version 20251024)
	(generator "kicad_symbol_editor")
	(generator_version "10.0")
	(symbol "LED"
		(pin_numbers (hide yes))
		(pin_names (offset 1.016) (hide yes))
		(exclude_from_sim no)
		(in_bom yes)
		(on_board yes)
		(property "Reference" "D" (at 0 2.54 0)
			(effects (font (size 1.27 1.27))))
		(property "Value" "LED" (at 0 -2.54 0)
			(effects (font (size 1.27 1.27))))
		(property "Footprint" "" (at 0 0 0)
			(show_name no) (hide yes) (effects (font (size 1.27 1.27))))
		(property "Datasheet" "" (at 0 0 0)
			(show_name no) (hide yes) (effects (font (size 1.27 1.27))))
		(property "Description" "Light emitting diode" (at 0 0 0)
			(show_name no) (hide yes) (effects (font (size 1.27 1.27))))
		(symbol "LED_0_1"
			(polyline (pts (xy -1.27 -1.27) (xy -1.27 1.27))
				(stroke (width 0.254) (type default)) (fill (type none)))
			(polyline (pts (xy -1.27 0) (xy 1.27 0))
				(stroke (width 0) (type default)) (fill (type none)))
			(polyline (pts (xy 1.27 -1.27) (xy 1.27 1.27) (xy -1.27 0) (xy 1.27 -1.27))
				(stroke (width 0.254) (type default)) (fill (type none))))
		(symbol "LED_1_1"
			(pin passive line (at -3.81 0 0) (length 2.54)
				(name "K" (effects (font (size 1.27 1.27))))
				(number "1" (effects (font (size 1.27 1.27)))))
			(pin passive line (at 3.81 0 180) (length 2.54)
				(name "A" (effects (font (size 1.27 1.27))))
				(number "2" (effects (font (size 1.27 1.27))))))
		(embedded_fonts no)
	)
)
`;

// ---- the repository ----------------------------------------------------------

const PACKAGES: RepoPackage[] = [
  {
    id: 'com.ziroeda.theme.nord',
    kind: 'colortheme',
    name: 'Nord',
    description: 'The Nord arctic, north-bluish colour palette — a calm dark theme.',
    author: 'ZiroEDA',
    version: '1.0.0',
    license: 'MIT',
    theme: NORD,
  },
  {
    id: 'com.ziroeda.theme.solarized-dark',
    kind: 'colortheme',
    name: 'Solarized Dark',
    description: "Ethan Schoonover's Solarized palette, dark background.",
    author: 'ZiroEDA',
    version: '1.0.0',
    license: 'MIT',
    theme: SOLARIZED_DARK,
  },
  {
    id: 'com.ziroeda.theme.solarized-light',
    kind: 'colortheme',
    name: 'Solarized Light',
    description: "Ethan Schoonover's Solarized palette, light background.",
    author: 'ZiroEDA',
    version: '1.0.0',
    license: 'MIT',
    theme: SOLARIZED_LIGHT,
  },
  {
    id: 'com.ziroeda.theme.high-contrast',
    kind: 'colortheme',
    name: 'High Contrast',
    description: 'A pure-black, high-saturation theme for maximum legibility.',
    author: 'ZiroEDA',
    version: '1.0.0',
    license: 'MIT',
    theme: HIGH_CONTRAST,
  },
  {
    id: 'com.ziroeda.lib.passives',
    kind: 'library',
    name: 'Basic Passives',
    description: 'A starter symbol library: resistor, capacitor and inductor.',
    author: 'ZiroEDA',
    version: '1.0.0',
    license: 'CC-BY-SA-4.0',
    libraries: [{ name: 'ZiroEDA_Passives', text: LIB_PASSIVES }],
  },
  {
    id: 'com.ziroeda.lib.led',
    kind: 'library',
    name: 'LED',
    description: 'A single-symbol library with a light-emitting diode.',
    author: 'ZiroEDA',
    version: '1.0.0',
    license: 'CC-BY-SA-4.0',
    libraries: [{ name: 'ZiroEDA_LED', text: LIB_LED }],
  },
];

export const DEFAULT_REPOSITORY: Repository = {
  url: '',
  name: 'ZiroEDA Default Repository',
  packages: PACKAGES,
};
