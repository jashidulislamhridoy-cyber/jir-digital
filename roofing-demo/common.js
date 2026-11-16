
const SVC=[["Roof Repair", "wrench", "roof-repair"], ["Roof Replacement", "refresh-ccw", "roof-replacement"], ["Roof Installation", "hammer", "roof-installation"], ["Roof Leak Detection", "droplets", "roof-leak-detection"], ["Storm Damage Restoration", "cloud-lightning", "storm-damage-repair"], ["Commercial Roofing", "building-2", "commercial-roofing"], ["Residential Roofing", "house", "residential-roofing"], ["Gutter Installation & Repair", "cloud-rain", "gutter-installation-repair"]];
const ddl=document.getElementById("ddList");if(ddl)ddl.innerHTML=SVC.map(s=>`<li><a href="service-${s[2]}.html" class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-charcoal hover:bg-offwhite"><span class="grid size-9 place-items-center rounded-lg bg-accent-50 text-accent"><i data-lucide="${s[1]}" class="size-[18px]"></i></span>${s[0]}</a></li>`).join("");
const fs=document.getElementById("fsvc");if(fs)fs.innerHTML=SVC.map(s=>`<li><a class="hover:text-accent" href="service-${s[2]}.html">${s[0]}</a></li>`).join("");
window.lucide&&lucide.createIcons();
const hdr=document.getElementById("hdr");const onS=()=>{const s=scrollY>24;hdr.classList.toggle("bg-charcoal/95",s);hdr.classList.toggle("backdrop-blur-md",s);hdr.classList.toggle("py-3",s);hdr.classList.toggle("py-5",!s)};addEventListener("scroll",onS,{passive:true});onS();
const dd=document.getElementById("dd"),dm=document.getElementById("ddMenu"),db=document.getElementById("ddBtn");let tmr;
const op=v=>{dm.classList.toggle("hidden",!v);db.setAttribute("aria-expanded",v);document.getElementById("ddIco").style.transform=v?"rotate(180deg)":""};
dd.onmouseenter=()=>{clearTimeout(tmr);op(true)};dd.onmouseleave=()=>{tmr=setTimeout(()=>op(false),140)};db.onclick=()=>op(dm.classList.contains("hidden"));
addEventListener("keydown",e=>{if(e.key==="Escape"){op(false);mm.style.maxHeight="0px"}});
const mm=document.getElementById("mMenu");document.getElementById("mBtn").onclick=()=>{const o=mm.style.maxHeight!=="0px";mm.style.maxHeight=o?"0px":"80vh";if(!o)hdr.classList.add("bg-charcoal/95")};
document.querySelectorAll("[data-ba]").forEach(ba=>{const clip=ba.querySelector(".baClip"),line=ba.querySelector(".baLine"),rg=ba.querySelector("input");let drag=false;
 const set=p=>{p=Math.max(0,Math.min(100,p));clip.style.clipPath=`inset(0 ${100-p}% 0 0)`;line.style.left=p+"%";rg.value=Math.round(p)};
 const fx=x=>{const r=ba.getBoundingClientRect();set((x-r.left)/r.width*100)};
 ba.addEventListener("pointerdown",e=>{drag=true;ba.setPointerCapture(e.pointerId);fx(e.clientX)});ba.addEventListener("pointermove",e=>drag&&fx(e.clientX));
 ["pointerup","pointercancel"].forEach(ev=>ba.addEventListener(ev,()=>drag=false));rg.oninput=()=>set(+rg.value)});
document.querySelectorAll(".fq").forEach(b=>b.onclick=()=>{const box=b.closest(".faqbox");const open=b.getAttribute("aria-expanded")==="true";box.querySelectorAll(".fq").forEach(x=>{x.setAttribute("aria-expanded","false");x.querySelector(".ico").classList.remove("rotate-45","bg-accent","text-white");x.closest(".fqi").querySelector(".pn").style.gridTemplateRows="0fr"});if(!open){b.setAttribute("aria-expanded","true");b.querySelector(".ico").classList.add("rotate-45","bg-accent","text-white");b.closest(".fqi").querySelector(".pn").style.gridTemplateRows="1fr"}});
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target);const pl=document.getElementById("pline");if(pl&&e.target.closest("#steps"))pl.style.transform="scaleX(1)"}}),{rootMargin:"-40px"});
document.querySelectorAll(".rv").forEach((el,i)=>{el.style.transitionDelay=(i%4)*80+"ms";io.observe(el)});
