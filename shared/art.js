/* ============================================================================
   SPRINT — Ilustrimet e pjatave (SVG i pastër, pa varësi nga interneti).
   Këto janë ART PLACEHOLDER. Kur të keni fotot reale:
     1) vendosini në /assets/dishes/<id>.jpg
     2) te data.js shtoni fushën  img:'assets/dishes/p1.jpg'  te pjata
     3) SPRINT.art() i përdor automatikisht fotot nëse ekziston `img`.
   ========================================================================== */
(function () {
  const S = (id, body) =>
    `<symbol id="art-${id}" viewBox="0 0 200 200">${body}</symbol>`;

  // paleta e përbashkët e ilustrimeve
  const sprite = `
<svg id="sprint-art-sprite" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden">
<defs>
  <radialGradient id="g-plate" cx="38%" cy="30%">
    <stop offset="0" stop-color="#fffdf8"/><stop offset="1" stop-color="#e6ddcd"/>
  </radialGradient>
  <radialGradient id="g-crust" cx="40%" cy="32%">
    <stop offset="0" stop-color="#f2c987"/><stop offset=".7" stop-color="#dfa75a"/><stop offset="1" stop-color="#c98a3f"/>
  </radialGradient>
  <linearGradient id="g-meat" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#8a4a2e"/><stop offset="1" stop-color="#5a2c19"/>
  </linearGradient>
  <linearGradient id="g-gold" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#f7d17a"/><stop offset="1" stop-color="#d19b32"/>
  </linearGradient>
</defs>

${S('pizza', `
  <ellipse cx="100" cy="176" rx="74" ry="10" fill="rgba(0,0,0,.16)"/>
  <circle cx="100" cy="98" r="82" fill="url(#g-crust)"/>
  <circle cx="100" cy="98" r="82" fill="none" stroke="#b87a33" stroke-width="2" opacity=".55"/>
  <circle cx="100" cy="98" r="68" fill="#c9392b"/>
  <circle cx="100" cy="98" r="68" fill="none" stroke="#a82a1e" stroke-width="1.5" opacity=".6"/>
  <g fill="#f6dd9c" opacity=".95">
    <ellipse cx="76" cy="72" rx="17" ry="12" transform="rotate(-18 76 72)"/>
    <ellipse cx="126" cy="82" rx="15" ry="11" transform="rotate(24 126 82)"/>
    <ellipse cx="92" cy="124" rx="19" ry="12" transform="rotate(8 92 124)"/>
    <ellipse cx="132" cy="126" rx="13" ry="10" transform="rotate(-30 132 126)"/>
    <ellipse cx="62" cy="106" rx="12" ry="9"/>
  </g>
  <g fill="#a3221a">
    <circle cx="72" cy="94" r="10"/><circle cx="118" cy="62" r="9"/>
    <circle cx="140" cy="104" r="9.5"/><circle cx="104" cy="140" r="9"/>
    <circle cx="66" cy="134" r="7.5"/><circle cx="104" cy="92" r="8"/>
  </g>
  <g fill="#3f8f3a">
    <path d="M86 60c8-9 20-9 24-2-8 8-19 9-24 2z"/>
    <path d="M128 138c9-7 20-4 22 3-9 5-19 3-22-3z"/>
    <path d="M52 84c7-8 17-8 21-2-7 7-17 8-21 2z"/>
  </g>
  <path d="M100 16a82 82 0 0 1 58 24" fill="none" stroke="#ffe9c2" stroke-width="5" stroke-linecap="round" opacity=".5"/>
`)}

${S('pizzaV', `
  <ellipse cx="100" cy="176" rx="74" ry="10" fill="rgba(0,0,0,.16)"/>
  <circle cx="100" cy="98" r="82" fill="url(#g-crust)"/>
  <circle cx="100" cy="98" r="68" fill="#b8402c"/>
  <g fill="#f6dd9c" opacity=".9">
    <ellipse cx="82" cy="76" rx="16" ry="11" transform="rotate(-14 82 76)"/>
    <ellipse cx="122" cy="118" rx="15" ry="11" transform="rotate(22 122 118)"/>
    <ellipse cx="70" cy="120" rx="13" ry="10"/>
  </g>
  <g fill="#4f9c3f">
    <rect x="60" y="86" width="26" height="9" rx="4.5" transform="rotate(-24 60 86)"/>
    <rect x="104" y="66" width="28" height="9" rx="4.5" transform="rotate(16 104 66)"/>
    <rect x="88" y="126" width="26" height="9" rx="4.5" transform="rotate(-8 88 126)"/>
  </g>
  <g fill="#e8792a">
    <rect x="112" y="92" width="24" height="8" rx="4" transform="rotate(38 112 92)"/>
    <rect x="66" y="106" width="22" height="8" rx="4" transform="rotate(-40 66 106)"/>
  </g>
  <g fill="#6b4a8f" opacity=".85">
    <ellipse cx="100" cy="98" rx="12" ry="9"/><ellipse cx="132" cy="82" rx="10" ry="8"/>
    <ellipse cx="78" cy="142" rx="9" ry="7"/>
  </g>
  <g fill="#2f6f2c"><circle cx="118" cy="140" r="5"/><circle cx="56" cy="94" r="4.4"/></g>
  <path d="M100 16a82 82 0 0 1 58 24" fill="none" stroke="#ffe9c2" stroke-width="5" stroke-linecap="round" opacity=".5"/>
`)}

${S('pizzaW', `
  <ellipse cx="100" cy="176" rx="74" ry="10" fill="rgba(0,0,0,.16)"/>
  <circle cx="100" cy="98" r="82" fill="url(#g-crust)"/>
  <circle cx="100" cy="98" r="68" fill="#f7e6bd"/>
  <g fill="#fff6dd">
    <ellipse cx="78" cy="76" rx="22" ry="16" transform="rotate(-16 78 76)"/>
    <ellipse cx="126" cy="88" rx="20" ry="15" transform="rotate(20 126 88)"/>
    <ellipse cx="92" cy="128" rx="24" ry="16"/>
    <ellipse cx="134" cy="130" rx="17" ry="13" transform="rotate(-24 134 130)"/>
    <ellipse cx="60" cy="112" rx="15" ry="12"/>
  </g>
  <g fill="#dfc07a" opacity=".8">
    <ellipse cx="100" cy="96" rx="18" ry="12" transform="rotate(10 100 96)"/>
    <ellipse cx="70" cy="140" rx="13" ry="9"/>
  </g>
  <g fill="#8fa6c4" opacity=".55">
    <circle cx="86" cy="92" r="4"/><circle cx="118" cy="112" r="3.4"/><circle cx="104" cy="70" r="3"/>
    <circle cx="140" cy="106" r="3"/><circle cx="72" cy="118" r="2.8"/>
  </g>
  <g fill="#3f8f3a"><path d="M108 138c9-8 21-6 24 1-9 7-20 7-24-1z"/></g>
  <path d="M100 16a82 82 0 0 1 58 24" fill="none" stroke="#ffe9c2" stroke-width="5" stroke-linecap="round" opacity=".5"/>
`)}

${S('pizzaC', `
  <ellipse cx="100" cy="176" rx="74" ry="10" fill="rgba(0,0,0,.16)"/>
  <circle cx="100" cy="98" r="82" fill="url(#g-crust)"/>
  <circle cx="100" cy="98" r="68" fill="#bf3222"/>
  <g fill="#f6dd9c" opacity=".9">
    <ellipse cx="74" cy="80" rx="16" ry="11" transform="rotate(-18 74 80)"/>
    <ellipse cx="128" cy="108" rx="15" ry="11" transform="rotate(24 128 108)"/>
    <ellipse cx="96" cy="134" rx="16" ry="10"/>
  </g>
  <g fill="#f0c9a8">
    <path d="M92 62c14-6 30-2 32 8-14 7-30 4-32-8z"/>
    <path d="M60 112c14-7 30-2 31 8-14 7-29 3-31-8z"/>
  </g>
  <g fill="#8c6b4a">
    <path d="M118 74c9-4 18 1 17 8-9 5-18 1-17-8z"/>
    <path d="M74 100c9-4 18 1 17 8-9 5-18 1-17-8z"/>
    <path d="M126 132c8-4 17 1 16 8-9 4-17 0-16-8z"/>
  </g>
  <g fill="#2f3b26"><ellipse cx="106" cy="96" rx="8" ry="6"/><ellipse cx="86" cy="120" rx="7" ry="5.4"/>
    <ellipse cx="140" cy="92" rx="7" ry="5.4"/><ellipse cx="64" cy="132" rx="6.4" ry="5"/></g>
  <g fill="#f5d33f"><circle cx="112" cy="118" r="9"/><circle cx="112" cy="118" r="9" fill="none" stroke="#fff" stroke-width="4" opacity=".55"/></g>
  <path d="M100 16a82 82 0 0 1 58 24" fill="none" stroke="#ffe9c2" stroke-width="5" stroke-linecap="round" opacity=".5"/>
`)}

${S('burger', `
  <ellipse cx="100" cy="178" rx="70" ry="9" fill="rgba(0,0,0,.16)"/>
  <path d="M28 88c0-34 32-58 72-58s72 24 72 58z" fill="#e5a75a"/>
  <path d="M28 88c0-34 32-58 72-58s72 24 72 58z" fill="url(#g-crust)"/>
  <g fill="#fff3d6" opacity=".85">
    <ellipse cx="76" cy="56" rx="5" ry="3.2" transform="rotate(-16 76 56)"/>
    <ellipse cx="106" cy="46" rx="5" ry="3.2" transform="rotate(12 106 46)"/>
    <ellipse cx="132" cy="64" rx="5" ry="3.2" transform="rotate(-8 132 64)"/>
    <ellipse cx="56" cy="74" rx="4.4" ry="3" transform="rotate(20 56 74)"/>
    <ellipse cx="100" cy="70" rx="4.6" ry="3" transform="rotate(-4 100 70)"/>
  </g>
  <path d="M24 90h152c0 9-6 12-14 12H38c-8 0-14-3-14-12z" fill="#e8c98d"/>
  <path d="M22 100c14-8 28 6 42-2s28 8 42 0 28 6 42-2c8 10 4 16-6 16H30c-10 0-14-6-8-12z" fill="#5aa640"/>
  <rect x="26" y="112" width="148" height="22" rx="10" fill="url(#g-meat)"/>
  <path d="M30 118c22-6 44 6 66 0s44 8 74 2" fill="none" stroke="#7a3d24" stroke-width="3" opacity=".5"/>
  <path d="M30 132c16 14 30-4 44 6s26-8 40 2 30-6 44 4c-6 6-14 6-24 6H50c-12 0-18-4-20-18z" fill="#f2b229"/>
  <path d="M26 148h148c10 0 14 22-8 24H34c-22-2-18-24-8-24z" fill="#dda75a"/>
`)}

${S('gyros', `
  <ellipse cx="100" cy="180" rx="56" ry="8" fill="rgba(0,0,0,.16)"/>
  <path d="M64 24h72l22 118c2 12-8 24-22 24H64c-14 0-24-12-22-24z" fill="#f0e6d2"/>
  <path d="M64 24h72l10 54H54z" fill="#e8dcc2"/>
  <path d="M70 30h60l16 96c2 10-6 20-18 20H72c-12 0-20-10-18-20z" fill="url(#g-crust)"/>
  <path d="M74 34h52l6 30H68z" fill="#f5d9a8"/>
  <g>
    <path d="M78 44c10-6 22-2 26 6-10 6-22 3-26-6z" fill="#5aa640"/>
    <ellipse cx="118" cy="50" rx="12" ry="8" fill="#d33c2c"/>
    <rect x="80" y="58" width="40" height="9" rx="4" fill="url(#g-meat)" transform="rotate(-8 80 58)"/>
    <rect x="98" y="66" width="36" height="8" rx="4" fill="#a1512f" transform="rotate(9 98 66)"/>
    <rect x="76" y="72" width="30" height="7" rx="3.5" fill="#f2c14e" transform="rotate(-4 76 72)"/>
  </g>
  <path d="M62 96h76" stroke="#cf9a4d" stroke-width="3" opacity=".5" stroke-linecap="round"/>
  <path d="M60 120h80" stroke="#cf9a4d" stroke-width="3" opacity=".4" stroke-linecap="round"/>
  <path d="M136 24l24 12-18 118c-2 12-12 12-16 8z" fill="rgba(0,0,0,.07)"/>
`)}

${S('fries', `
  <ellipse cx="100" cy="180" rx="58" ry="8" fill="rgba(0,0,0,.16)"/>
  <g fill="url(#g-gold)" stroke="#c08b28" stroke-width="1.5">
    <rect x="66" y="34" width="14" height="80" rx="5" transform="rotate(-13 66 34)"/>
    <rect x="88" y="24" width="14" height="92" rx="5" transform="rotate(-3 88 24)"/>
    <rect x="110" y="30" width="14" height="86" rx="5" transform="rotate(9 110 30)"/>
    <rect x="128" y="46" width="13" height="70" rx="5" transform="rotate(19 128 46)"/>
    <rect x="54" y="54" width="13" height="66" rx="5" transform="rotate(-22 54 54)"/>
  </g>
  <path d="M56 96h88l-10 66c-1 8-7 12-14 12H80c-7 0-13-4-14-12z" fill="#d92b2b"/>
  <path d="M56 96h88l-3 20H59z" fill="#b81f1f"/>
  <path d="M78 128h44v10H78z" fill="#fff" opacity=".85"/>
  <text x="100" y="152" text-anchor="middle" font-family="Arial Black,Arial" font-size="17" fill="#fff" opacity=".9">SPRINT</text>
`)}

${S('wings', `
  <ellipse cx="100" cy="178" rx="72" ry="10" fill="rgba(0,0,0,.16)"/>
  <ellipse cx="100" cy="108" rx="82" ry="62" fill="url(#g-plate)"/>
  <ellipse cx="100" cy="108" rx="70" ry="51" fill="none" stroke="#ded4c3" stroke-width="2"/>
  <g fill="#b8481f">
    <path d="M56 88c14-14 34-12 40 2 5 13-6 26-22 26S44 100 56 88z"/>
    <path d="M104 74c16-10 34-4 36 10 2 14-12 24-27 21s-24-22-9-31z"/>
    <path d="M78 124c16-8 33 0 34 14 1 13-14 21-28 16s-20-23-6-30z"/>
    <path d="M126 108c14-6 28 2 28 15 0 12-13 19-25 14s-16-24-3-29z"/>
  </g>
  <g fill="#e0682c" opacity=".7">
    <ellipse cx="70" cy="98" rx="12" ry="7" transform="rotate(-20 70 98)"/>
    <ellipse cx="122" cy="86" rx="12" ry="7" transform="rotate(16 122 86)"/>
    <ellipse cx="96" cy="134" rx="11" ry="6"/>
  </g>
  <circle cx="152" cy="66" r="18" fill="#fbf6ea" stroke="#e2d6bd" stroke-width="2"/>
  <circle cx="152" cy="66" r="12" fill="#f4efdd"/>
  <g fill="#4f9c3f"><circle cx="60" cy="140" r="4"/><circle cx="140" cy="142" r="3.4"/></g>
`)}

${S('steak', `
  <ellipse cx="100" cy="180" rx="74" ry="10" fill="rgba(0,0,0,.16)"/>
  <ellipse cx="100" cy="106" rx="84" ry="64" fill="url(#g-plate)"/>
  <ellipse cx="100" cy="106" rx="71" ry="52" fill="none" stroke="#ded4c3" stroke-width="2"/>
  <path d="M52 96c6-24 34-34 58-28 22 6 34 24 30 42-4 20-30 30-54 26S46 116 52 96z" fill="url(#g-meat)"/>
  <g stroke="#31160c" stroke-width="4" stroke-linecap="round" opacity=".55">
    <path d="M60 90l52 14"/><path d="M56 106l54 14"/><path d="M60 122l48 12"/>
  </g>
  <path d="M52 96c6-24 34-34 58-28" fill="none" stroke="#a9613c" stroke-width="4" opacity=".6"/>
  <g fill="#c9a13f" opacity=".9">
    <ellipse cx="146" cy="92" rx="15" ry="12" transform="rotate(-14 146 92)"/>
    <ellipse cx="152" cy="116" rx="13" ry="10" transform="rotate(18 152 116)"/>
    <ellipse cx="132" cy="132" rx="12" ry="9"/>
  </g>
  <g fill="#3f8f3a">
    <path d="M74 142c10-8 22-6 26 1-9 7-21 7-26-1z"/>
    <path d="M120 60c9-8 21-6 24 1-8 7-20 7-24-1z"/>
  </g>
`)}

${S('fish', `
  <ellipse cx="100" cy="180" rx="74" ry="10" fill="rgba(0,0,0,.16)"/>
  <ellipse cx="100" cy="106" rx="84" ry="64" fill="url(#g-plate)"/>
  <ellipse cx="100" cy="106" rx="71" ry="52" fill="none" stroke="#ded4c3" stroke-width="2"/>
  <path d="M42 106c22-30 62-38 92-24 12 6 20 14 24 24-4 10-12 18-24 24-30 14-70 6-92-24z" fill="#b9c6cf"/>
  <path d="M42 106c22-30 62-38 92-24 12 6 20 14 24 24-30 6-86 8-116 0z" fill="#d6e0e6"/>
  <path d="M158 106l24-22v44z" fill="#a9b8c2"/>
  <path d="M96 78c-4-14 4-24 12-26 2 12-2 22-12 26z" fill="#a9b8c2"/>
  <circle cx="66" cy="100" r="6" fill="#2b3540"/><circle cx="68" cy="98" r="2" fill="#fff"/>
  <g stroke="#93a5b1" stroke-width="2" opacity=".8" fill="none">
    <path d="M88 92c8 8 8 20 0 28"/><path d="M106 88c9 10 9 24 0 34"/><path d="M124 88c9 10 9 24 0 34"/>
  </g>
  <g><circle cx="148" cy="142" r="15" fill="#f5d33f"/><path d="M148 127a15 15 0 0 1 0 30z" fill="#ffe98a"/>
     <circle cx="148" cy="142" r="15" fill="none" stroke="#d9b425" stroke-width="2"/></g>
  <path d="M52 142c10-9 24-6 28 2-11 7-24 5-28-2z" fill="#3f8f3a"/>
`)}

${S('pasta', `
  <ellipse cx="100" cy="180" rx="74" ry="10" fill="rgba(0,0,0,.16)"/>
  <ellipse cx="100" cy="106" rx="84" ry="64" fill="url(#g-plate)"/>
  <ellipse cx="100" cy="106" rx="71" ry="52" fill="none" stroke="#ded4c3" stroke-width="2"/>
  <ellipse cx="100" cy="106" rx="58" ry="42" fill="#f0cf7e"/>
  <g fill="none" stroke="#e0b957" stroke-width="5" stroke-linecap="round" opacity=".95">
    <path d="M56 100c14-16 40-20 62-10s34 26 24 34"/>
    <path d="M52 114c18 14 46 18 68 8s28-24 20-30"/>
    <path d="M70 84c22-8 48-2 62 12"/>
    <path d="M64 128c22 8 48 4 62-8"/>
  </g>
  <g fill="#c9392b">
    <ellipse cx="88" cy="96" rx="12" ry="9" transform="rotate(-16 88 96)"/>
    <ellipse cx="122" cy="112" rx="11" ry="8" transform="rotate(20 122 112)"/>
    <ellipse cx="100" cy="126" rx="9" ry="7"/>
  </g>
  <g fill="#3f8f3a"><path d="M104 82c8-8 20-7 23 0-8 7-19 7-23 0z"/></g>
  <g fill="#fff8e6" opacity=".9"><circle cx="72" cy="120" r="3"/><circle cx="134" cy="94" r="2.6"/><circle cx="110" cy="140" r="2.6"/></g>
`)}

${S('salad', `
  <ellipse cx="100" cy="182" rx="64" ry="9" fill="rgba(0,0,0,.16)"/>
  <path d="M34 90h132c0 44-26 76-66 76S34 134 34 90z" fill="#f0e9db"/>
  <path d="M34 90h132c0 10-2 19-5 27H39c-3-8-5-17-5-27z" fill="#e2d8c4"/>
  <ellipse cx="100" cy="90" rx="66" ry="20" fill="#fbf7ee"/>
  <g fill="#4f9c3f">
    <path d="M52 88c10-20 34-26 46-16 10 9 2 26-14 30s-38 2-32-14z"/>
    <path d="M110 74c14-14 38-12 44 2 5 13-12 24-30 22s-25-14-14-24z"/>
    <path d="M72 100c14-8 32-4 36 6 3 9-12 16-28 13s-20-14-8-19z"/>
  </g>
  <g fill="#6fbf55" opacity=".8">
    <path d="M62 78c8-10 20-12 26-6-7 8-19 11-26 6z"/>
    <path d="M126 92c9-8 21-8 25-1-8 7-20 8-25 1z"/>
  </g>
  <g fill="#d33c2c"><circle cx="92" cy="82" r="9"/><circle cx="130" cy="96" r="7.5"/><circle cx="66" cy="98" r="7"/></g>
  <g fill="#fff" opacity=".95">
    <rect x="104" y="100" width="14" height="12" rx="2" transform="rotate(12 104 100)"/>
    <rect x="78" y="96" width="12" height="11" rx="2" transform="rotate(-18 78 96)"/>
  </g>
  <g fill="#2f2f2f"><circle cx="116" cy="84" r="5"/><circle cx="84" cy="106" r="4.4"/></g>
`)}

${S('tave', `
  <ellipse cx="100" cy="178" rx="76" ry="10" fill="rgba(0,0,0,.16)"/>
  <path d="M22 96h156c0 42-30 72-78 72S22 138 22 96z" fill="#a85a35"/>
  <path d="M22 96h156c0 12-2 22-7 32H29c-5-10-7-20-7-32z" fill="#8e4626"/>
  <ellipse cx="100" cy="96" rx="78" ry="26" fill="#c06a3d"/>
  <ellipse cx="100" cy="96" rx="66" ry="20" fill="#e8c98d"/>
  <ellipse cx="100" cy="95" rx="60" ry="17" fill="#f2dcae"/>
  <g fill="#dcae6a" opacity=".9">
    <ellipse cx="76" cy="92" rx="17" ry="7"/><ellipse cx="120" cy="98" rx="15" ry="6"/>
    <ellipse cx="100" cy="88" rx="12" ry="5"/>
  </g>
  <g fill="#c98b45" opacity=".7"><circle cx="88" cy="100" r="4"/><circle cx="130" cy="90" r="3.4"/><circle cx="64" cy="99" r="3.4"/></g>
  <path d="M12 104c0-8 4-12 10-12v18c-6 0-10-2-10-6z" fill="#8e4626"/>
  <path d="M188 104c0-8-4-12-10-12v18c6 0 10-2 10-6z" fill="#8e4626"/>
  <g stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35" fill="none">
    <path d="M78 60c-6-8 6-12 0-20"/><path d="M100 54c-6-8 6-12 0-20"/><path d="M122 60c-6-8 6-12 0-20"/>
  </g>
`)}

${S('byrek', `
  <ellipse cx="100" cy="176" rx="70" ry="10" fill="rgba(0,0,0,.16)"/>
  <ellipse cx="100" cy="120" rx="84" ry="46" fill="url(#g-plate)"/>
  <path d="M100 40l64 96H36z" fill="url(#g-crust)"/>
  <path d="M100 40l64 96H36z" fill="none" stroke="#c08b3c" stroke-width="2"/>
  <path d="M100 58l48 72H52z" fill="#f3d59a"/>
  <path d="M100 76l34 46H66z" fill="#6aa84f" opacity=".85"/>
  <g stroke="#d9a44f" stroke-width="2.5" opacity=".65" fill="none">
    <path d="M46 128h108"/><path d="M56 114h88"/><path d="M66 100h68"/>
  </g>
  <path d="M100 40l64 96" stroke="#fce6bb" stroke-width="4" opacity=".7" fill="none"/>
  <g fill="#fff" opacity=".8"><circle cx="86" cy="104" r="3"/><circle cx="112" cy="112" r="2.6"/></g>
`)}

${S('soup', `
  <ellipse cx="100" cy="178" rx="72" ry="10" fill="rgba(0,0,0,.16)"/>
  <ellipse cx="100" cy="132" rx="86" ry="26" fill="url(#g-plate)"/>
  <path d="M30 96h140c0 34-28 58-70 58s-70-24-70-58z" fill="#f3ece0"/>
  <path d="M30 96h140c0 9-2 17-5 25H35c-3-8-5-16-5-25z" fill="#e2d8c8"/>
  <ellipse cx="100" cy="96" rx="70" ry="22" fill="#fdfaf3"/>
  <ellipse cx="100" cy="96" rx="60" ry="17" fill="#e2802a"/>
  <ellipse cx="100" cy="95" rx="54" ry="14" fill="#f09338"/>
  <g fill="#fff" opacity=".85">
    <path d="M70 94c10-7 22-3 24 4-11 6-23 3-24-4z"/>
    <path d="M112 100c9-6 20-2 22 4-10 5-21 2-22-4z"/>
  </g>
  <g fill="#4f9c3f">
    <circle cx="92" cy="90" r="4"/><circle cx="106" cy="96" r="3.6"/><circle cx="84" cy="99" r="3.2"/>
    <circle cx="118" cy="90" r="3"/><circle cx="99" cy="103" r="3"/>
  </g>
  <g stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".4" fill="none">
    <path d="M80 62c-6-8 6-12 0-20"/><path d="M100 56c-6-8 6-12 0-20"/><path d="M120 62c-6-8 6-12 0-20"/>
  </g>
`)}

${S('sandwich', `
  <ellipse cx="100" cy="176" rx="72" ry="10" fill="rgba(0,0,0,.16)"/>
  <path d="M24 118c0-30 34-52 76-52s76 22 76 52z" fill="url(#g-crust)"/>
  <path d="M24 118c0-30 34-52 76-52s76 22 76 52z" fill="none" stroke="#c08b3c" stroke-width="2"/>
  <g fill="#fff3d6" opacity=".8">
    <ellipse cx="70" cy="92" rx="4.6" ry="3" transform="rotate(-14 70 92)"/>
    <ellipse cx="104" cy="82" rx="4.6" ry="3" transform="rotate(10 104 82)"/>
    <ellipse cx="136" cy="98" rx="4.4" ry="2.8" transform="rotate(-6 136 98)"/>
  </g>
  <path d="M20 120h160c0 8-6 11-14 11H34c-8 0-14-3-14-11z" fill="#eccd93"/>
  <path d="M18 130c16-7 30 6 46-1s30 8 46 1 30 6 46-2c8 9 4 15-6 15H26c-10 0-14-6-8-13z" fill="#5aa640"/>
  <path d="M22 142h156c6 0 8 10-2 12H26c-10-2-10-12-4-12z" fill="#d94b3a"/>
  <path d="M20 154h160c0 12-8 18-20 18H40c-12 0-20-6-20-18z" fill="#dda75a"/>
  <path d="M116 66l14-30 8 4-12 30z" fill="#a1512f"/>
`)}

${S('coffee', `
  <ellipse cx="96" cy="180" rx="60" ry="9" fill="rgba(0,0,0,.16)"/>
  <ellipse cx="96" cy="166" rx="72" ry="16" fill="url(#g-plate)"/>
  <ellipse cx="96" cy="164" rx="56" ry="11" fill="#e8dfd0"/>
  <path d="M46 84h100l-8 62c-1 12-11 20-24 20H78c-13 0-23-8-24-20z" fill="#fbf7ef"/>
  <path d="M46 84h100l-2 16H48z" fill="#eee7da"/>
  <ellipse cx="96" cy="84" rx="50" ry="13" fill="#fdfbf6"/>
  <ellipse cx="96" cy="84" rx="42" ry="10" fill="#5b3418"/>
  <ellipse cx="96" cy="83" rx="34" ry="8" fill="#8a5628"/>
  <path d="M74 82c8-5 18-2 20 4-9 5-19 2-20-4z" fill="#e8d9bf" opacity=".9"/>
  <path d="M146 96c22-6 32 8 28 22-4 13-20 18-32 14l3-12c7 2 15 0 17-6 2-7-5-11-16-7z" fill="#fbf7ef"/>
  <g stroke="#c9b89c" stroke-width="3" stroke-linecap="round" opacity=".55" fill="none">
    <path d="M80 54c-6-8 6-12 0-20"/><path d="M100 48c-6-8 6-12 0-20"/><path d="M118 54c-6-8 6-12 0-20"/>
  </g>
`)}

${S('beer', `
  <ellipse cx="100" cy="182" rx="50" ry="8" fill="rgba(0,0,0,.16)"/>
  <path d="M62 62h74v100c0 10-8 18-18 18H80c-10 0-18-8-18-18z" fill="#d9e6ee" opacity=".45"/>
  <path d="M68 78h62v82c0 7-6 12-13 12H81c-7 0-13-5-13-12z" fill="#e8a51c"/>
  <path d="M68 78h62v14H68z" fill="#f3bd40"/>
  <path d="M60 52c0-10 10-16 22-14 6-8 20-8 26 0 12-4 24 3 24 13 0 9-8 15-20 15H78c-11 0-18-6-18-14z" fill="#fffdf7"/>
  <path d="M60 52c8 8 24 10 40 10s32-2 40-10c0 10-8 16-20 16H78c-11 0-18-6-18-16z" fill="#f0ece0"/>
  <path d="M136 92c22-4 30 10 26 24-4 13-18 18-28 14l3-13c6 2 13 0 15-6 2-6-5-9-14-6z" fill="#d9e6ee" opacity=".55"/>
  <g fill="#fff" opacity=".45">
    <rect x="80" y="102" width="7" height="50" rx="3.5"/>
  </g>
  <g fill="#fff" opacity=".3">
    <circle cx="110" cy="112" r="4.5"/><circle cx="118" cy="134" r="3.4"/><circle cx="102" cy="146" r="3"/>
  </g>
`)}

${S('meze', `
  <ellipse cx="100" cy="176" rx="76" ry="10" fill="rgba(0,0,0,.16)"/>
  <ellipse cx="100" cy="112" rx="86" ry="54" fill="url(#g-plate)"/>
  <ellipse cx="100" cy="112" rx="72" ry="43" fill="none" stroke="#ded4c3" stroke-width="2"/>
  <g fill="#fdf6e4" stroke="#e8dcc0" stroke-width="1.5">
    <rect x="46" y="82" width="34" height="26" rx="3" transform="rotate(-8 46 82)"/>
    <rect x="52" y="106" width="32" height="24" rx="3" transform="rotate(6 52 106)"/>
  </g>
  <g fill="#f2d98c" stroke="#dcc06a" stroke-width="1.5">
    <rect x="96" y="76" width="32" height="22" rx="3" transform="rotate(10 96 76)"/>
    <rect x="104" y="100" width="30" height="21" rx="3" transform="rotate(-6 104 100)"/>
  </g>
  <g fill="#3d4a2a">
    <ellipse cx="146" cy="92" rx="9" ry="7" transform="rotate(-18 146 92)"/>
    <ellipse cx="152" cy="112" rx="8.4" ry="6.4" transform="rotate(14 152 112)"/>
    <ellipse cx="136" cy="126" rx="8" ry="6" transform="rotate(-8 136 126)"/>
  </g>
  <g fill="#7d9e43">
    <ellipse cx="120" cy="132" rx="8" ry="6"/><ellipse cx="70" cy="136" rx="7.5" ry="5.6"/>
  </g>
  <g fill="#3f8f3a"><path d="M86 128c9-8 21-6 24 1-9 7-20 7-24-1z"/></g>
`)}

${S('dessert', `
  <ellipse cx="100" cy="180" rx="70" ry="10" fill="rgba(0,0,0,.16)"/>
  <ellipse cx="100" cy="146" rx="82" ry="30" fill="url(#g-plate)"/>
  <path d="M46 68h108v66c0 8-6 14-14 14H60c-8 0-14-6-14-14z" fill="#f6e3bd"/>
  <path d="M46 68h108v18H46z" fill="#fff6e2"/>
  <path d="M46 96h108v14H46z" fill="#e8c98d"/>
  <path d="M46 118h108v14H46z" fill="#fff6e2"/>
  <path d="M46 60c0-10 24-16 54-16s54 6 54 16-24 14-54 14-54-4-54-14z" fill="#c98a3f"/>
  <path d="M46 60c0-10 24-16 54-16s54 6 54 16c-14 10-94 10-108 0z" fill="#e0a75a"/>
  <path d="M46 62c14 8 94 8 108 0v10c-14 8-94 8-108 0z" fill="#b9762f"/>
  <g fill="#fff" opacity=".9">
    <circle cx="76" cy="52" r="6"/><circle cx="124" cy="50" r="5"/>
  </g>
  <circle cx="100" cy="46" r="9" fill="#d33c2c"/>
  <path d="M100 37c4-6 10-6 12-2-4 5-9 5-12 2z" fill="#3f8f3a"/>
`)}

${S('drink', `
  <ellipse cx="100" cy="182" rx="46" ry="8" fill="rgba(0,0,0,.16)"/>
  <path d="M62 44h76l-10 118c-1 9-8 16-17 16H89c-9 0-16-7-17-16z" fill="#d9e6ee" opacity=".55"/>
  <path d="M66 78h68l-8 84c-1 7-6 12-13 12H87c-7 0-12-5-13-12z" fill="#c0392b"/>
  <path d="M66 78h68l-2 20H68z" fill="#e05548"/>
  <ellipse cx="100" cy="46" rx="38" ry="9" fill="#eef5fa" opacity=".8"/>
  <rect x="106" y="8" width="9" height="56" rx="4" fill="#f4f0e6" transform="rotate(11 106 8)"/>
  <g fill="#fff" opacity=".55">
    <rect x="76" y="92" width="7" height="52" rx="3.5"/>
  </g>
  <g fill="#fff" opacity=".28">
    <circle cx="112" cy="110" r="5"/><circle cx="120" cy="132" r="3.6"/><circle cx="104" cy="146" r="3"/>
  </g>
  <ellipse cx="100" cy="46" rx="30" ry="6" fill="#fff" opacity=".5"/>
`)}
</svg>`;

  function inject() {
    if (document.getElementById('sprint-art-sprite')) return;
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    d.innerHTML = sprite;
    document.body.insertBefore(d, document.body.firstChild);
  }

  /**
   * Kthen HTML-në e ilustrimit për një pjatë/kategori.
   * Nëse pjata ka `img` (foto reale), përdor foton; ndryshe SVG-në.
   */
  function art(item, cls) {
    const k = (item && item.art) || 'pizza';
    const alt = (item && (item.sq || item.en)) || '';
    if (item && item.img) {
      return `<img class="${cls || 'art'}" src="${item.img}" alt="${alt}" loading="lazy" decoding="async">`;
    }
    let hsh = 0; const key = (item && item.id) || k;
    for (let i = 0; i < key.length; i++) hsh = (hsh * 31 + key.charCodeAt(i)) | 0;
    const rot = ((hsh % 9) - 4) * 3.5; // −14° … +14°
    return `<svg class="${cls || 'art'}" style="--rot:${rot}deg" viewBox="0 0 200 200" role="img" aria-label="${alt}"><use href="#art-${k}"/></svg>`;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();

  window.SPRINT = window.SPRINT || {};
  window.SPRINT.art = art;
  window.SPRINT.injectArt = inject;
})();
