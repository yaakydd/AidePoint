import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect, Line } from 'react-native-svg';

// ─── CONDITION ICONS (UNCHANGED) ───────────────────────────────
// (Keeping your SVG icons exactly as-is for brevity in this fix)
// ... assume ALL icon components remain unchanged ...

// ─── SVG CONDITION ICONS ────────────────────────────────────────────────────── // Each icon is a simple SVG illustration of the cell morphology for that // condition. react-native-svg renders these natively on both Android and iOS. 
// // Sickle Cell — crescent-shaped erythrocytes 

const Condition = () => {

function SickleCellIcon({ size = 56 }) { 
  return ( 
  <Svg width={size} height={size} viewBox="0 0 56 56"> 
  <Rect width="56" height="56" rx="14" fill="#FFF0F0" /> 
  {/* Normal round cell */} 
  <Circle cx="13" cy="20" r="8" fill="#FECACA" stroke="#EF4444" strokeWidth="1.5" /> 
  {/* Sickle/crescent — quadratic bezier curves forming the crescent */} 
  <Path d="M26 34 Q40 16 45 26 Q44 40 32 43 Q23 43 26 34 Z" fill="#EF4444" opacity="0.9" /> 
  {/* Second sickle partially visible */} <Path d="M16 40 Q28 30 34 34 Q29 46 16 40 Z" fill="#B91C1C" opacity="0.7" /> </Svg> 
  ); 
} 
// Iron Deficiency — small pale cells with enlarged central pallor 
function IronDeficiencyIcon({ size = 56 }) { 
  return ( 
  <Svg width={size} height={size} viewBox="0 0 56 56"> 
  <Rect width="56" height="56" rx="14" fill="#FFFBEB" /> 
  {/* Hypochromic cell 1 — ring of colour, large pale centre */} 
  <Circle cx="18" cy="25" r="11" fill="#FDE68A" stroke="#D97706" strokeWidth="1.5" /> 
  <Circle cx="18" cy="25" r="6.5" fill="#FFFBEB" /> {/* big pale zone */} 
  {/* Hypochromic cell 2 */} 
  <Circle cx="38" cy="33" r="10" fill="#FCD34D" stroke="#D97706" strokeWidth="1.5" opacity="0.9" />
  <Circle cx="38" cy="33" r="6" fill="#FFFBEB" /> 
  {/* Small third cell partially visible */} 
  <Circle cx="30" cy="16" r="7" fill="#FDE68A" stroke="#D97706" strokeWidth="1" opacity="0.7" /> 
  <Circle cx="30" cy="16" r="4" fill="#FFFBEB" opacity="0.9" /> </Svg> 
  ); 
} 

// Malaria — parasitized cell with ring-form trophozoite 
function MalariaIcon({ size = 56 }) { 
  return ( 
  <Svg width={size} height={size} viewBox="0 0 56 56"> 
  <Rect width="56" height="56" rx="14" fill="#FEF9C3" /> 
  {/* Host erythrocyte */} 
  <Circle cx="28" cy="30" r="16" fill="#FEF3C7" stroke="#CA8A04" strokeWidth="2" /> 
  {/* Ring-form parasite: open circle (ring stage of Plasmodium) */}
  <Circle cx="28" cy="30" r="7.5" fill="none" stroke="#92400E" strokeWidth="2.5" /> 
  {/* Nucleus dot — the violet granule seen in stained smears */} 
  <Circle cx="33" cy="24" r="3.5" fill="#92400E" /> </Svg> 
  ); 
} 

// Thalassemia — target cells (codocytes) with bull's-eye pattern 
function ThalassemiaIcon({ size = 56 }) { 
  return ( 
  <Svg width={size} height={size} viewBox="0 0 56 56"> 
  <Rect width="56" height="56" rx="14" fill="#EFF6FF" /> 
  {/* Large target cell — 3 concentric zones */} 
  <Circle cx="24" cy="29" r="14" fill="#DBEAFE" stroke="#2563EB" strokeWidth="2" /> 
  <Circle cx="24" cy="29" r="7" fill="#93C5FD" /> 
  {/* middle zone */} 
  <Circle cx="24" cy="29" r="3" fill="#1D4ED8" /> 
  {/* central dense spot */} 
  {/* Smaller target cell */} 
  <Circle cx="43" cy="19" r="9" fill="#BFDBFE" stroke="#2563EB" strokeWidth="1.5" opacity="0.75" /> 
  <Circle cx="43" cy="19" r="4.5" fill="#60A5FA" opacity="0.75" /> <Circle cx="43" cy="19" r="1.8" fill="#1D4ED8" opacity="0.75" /> </Svg> 
  );
 } 
 
 // Pernicious Anemia — large oval macrocytes (macro-ovalocytes) 
 function PerniciousIcon({ size = 56 }) { 
  return ( 
  <Svg width={size} height={size} viewBox="0 0 56 56"> 
  <Rect width="56" height="56" rx="14" fill="#F5F3FF" /> 
  {/* Large oval cell 1 */} 
  <Ellipse cx="22" cy="33" rx="14" ry="11" fill="#DDD6FE" stroke="#7C3AED" strokeWidth="1.5" /> 
  {/* Large oval cell 2 — slightly different angle */} 
  <Ellipse cx="39" cy="22" rx="11" ry="9" fill="#C4B5FD" stroke="#7C3AED" strokeWidth="1.5" opacity="0.85" /> </Svg> 
  ); 
} 

// Megaloblastic Anemia — giant cell with multilobed neutrophil nucleus 

function MegaloblasticIcon({ size = 56 }) { 
  return ( 
  <Svg width={size} height={size} viewBox="0 0 56 56"> 
  <Rect width="56" height="56" rx="14" fill="#F0FDFA" /> 
  {/* Giant macro-ovalocyte */} 
  <Ellipse cx="28" cy="30" rx="17" ry="14" fill="#99F6E4" stroke="#0D9488" strokeWidth="2" /> 
  {/* Multilobed nucleus: 3 connected circles simulating hypersegmented neutrophil */} 
  <Circle cx="22" cy="30" r="4.5" fill="#0D9488" opacity="0.7" /> 
  <Circle cx="28" cy="25" r="4.5" fill="#0D9488" opacity="0.7" /> 
  <Circle cx="34" cy="30" r="4.5" fill="#0D9488" opacity="0.7" /> 
  {/* Lines connecting the nuclear lobes */} 
  <Line x1="26" y1="30" x2="24" y2="27" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" /> 
  <Line x1="30" y1="27" x2="32" y2="28" stroke="#0D9488" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" /> </Svg> 
  ); 
} 

// Aplastic Anemia — very sparse cells (pancytopenia pattern) 
// 
function AplasticIcon({ size = 56 }) { 
  return ( 
  <Svg width={size} height={size} viewBox="0 0 56 56"> 
  <Rect width="56" height="56" rx="14" fill="#FFF5F5" /> 
  {/* Only 2 actual cells — representing severe pancytopenia */} 
  <Circle cx="16" cy="20" r="7" fill="#FCA5A5" stroke="#DC2626" strokeWidth="1.5" /> 
  <Circle cx="40" cy="37" r="6" fill="#FCA5A5" stroke="#DC2626" strokeWidth="1.5" /> 
  {/* Ghost outlines where cells should be — shows hypocellularity */} 
  <Circle cx="32" cy="17" r="5.5" fill="none" stroke="#FCA5A5" strokeWidth="1" strokeDasharray="2 2" /> 
  <Circle cx="16" cy="38" r="5" fill="none" stroke="#FCA5A5" strokeWidth="1" strokeDasharray="2 2" /> 
  <Circle cx="42" cy="20" r="4.5" fill="none" stroke="#FCA5A5" strokeWidth="1" strokeDasharray="2 2" /> </Svg> 
  ); 
} 

// Hemolytic Anemia — fragmented cells (schistocytes, helmet cells) 
// 
function HemolyticIcon({ size = 56 }) { 
  return ( 
  <Svg width={size} height={size} viewBox="0 0 56 56"> 
  <Rect width="56" height="56" rx="14" fill="#FFF7ED" /> 
  {/* Helmet cell — parallelogram shape */}
   <Path d="M10 30 L20 18 L30 24 L20 36 Z" fill="#FDBA74" stroke="#EA580C" strokeWidth="1.5" /> 
   {/* Triangle fragment — schistocyte */} 
   <Path d="M33 18 L46 21 L41 33 Z" fill="#FB923C" stroke="#EA580C" strokeWidth="1.5" /> 
   {/* Small fragment */} 
   <Path d="M16 40 L27 38 L25 46 Z" fill="#FDBA74" stroke="#EA580C" strokeWidth="1.5" opacity="0.8" /> 
   {/* Partially lysed cell with crack line */} 
   <Circle cx="39" cy="39" r="8" fill="#FED7AA" stroke="#EA580C" strokeWidth="1.5" /> 
   <Line x1="36" y1="35" x2="42" y2="41" stroke="#EA580C" strokeWidth="1.5" strokeLinecap="round" /> </Svg> 
   ); 
  } 
  // Normal — healthy biconcave disc erythrocytes 
  // 
  function NormalIcon({ size = 56 }) { 
    return ( <Svg width={size} height={size} viewBox="0 0 56 56"> 
    <Rect width="56" height="56" rx="14" fill="#ECFDF5" /> 
    {/* Round cell 1 with slight central pallor — normal disc shape */} 
    <Circle cx="20" cy="30" r="12" fill="#BBF7D0" stroke="#16A34A" strokeWidth="1.5" /> 
    <Circle cx="20" cy="30" r="5.5" fill="#D1FAE5" /> {/* Round cell 2 */} 
    <Circle cx="39" cy="23" r="10" fill="#86EFAC" stroke="#16A34A" strokeWidth="1.5" opacity="0.9" /> 
    <Circle cx="39" cy="23" r="4.5" fill="#D1FAE5" opacity="0.9" /> </Svg> 
    ); 
  }

// ─── CONDITION ICON MAPPING ────────────────────────────────────
const CONDITION_ICONS = {
  sickle_cell: SickleCellIcon,
  iron_deficiency: IronDeficiencyIcon,
  malaria: MalariaIcon,
  thalassemia: ThalassemiaIcon,
  pernicious: PerniciousIcon,
  megaloblastic: MegaloblasticIcon,
  aplastic: AplasticIcon,
  hemolytic: HemolyticIcon,
  normal: NormalIcon,
};

// ─── SMALL COMPONENTS ──────────────────────────────────────────
function ConditionIcon({ condition, size = 56 }) {
  const Icon = CONDITION_ICONS[condition] ?? NormalIcon;
  return <Icon size={size} />;
}

function ConditionBadge({ condition }) {
  const cfg = CONDITION_CONFIG[condition] ?? CONDITION_CONFIG.normal;

  return (
    <View style={[styles.badge, { backgroundColor: cfg.badgeBg }]}>
      <View style={[styles.badgeDot, { backgroundColor: cfg.badgeDot }]} />
      <Text style={[styles.badgeLabel, { color: cfg.badgeText }]}>
        {cfg.label}
      </Text>
    </View>
  );
}
}
export default Condition;