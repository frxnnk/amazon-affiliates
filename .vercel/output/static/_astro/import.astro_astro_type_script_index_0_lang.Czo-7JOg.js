const g=document.getElementById("amazonUrl"),l=document.getElementById("parseBtn"),c=document.getElementById("extractedSection"),f=document.getElementById("statusMessage"),u=document.getElementById("productForm"),C=document.getElementById("resetBtn"),v=document.getElementById("previewAsin"),y=document.getElementById("previewMarketplace"),h=document.getElementById("previewUrl"),I=document.getElementById("previewTitle"),m=document.getElementById("suggestedTitleItem"),w=document.getElementById("formAsin"),B=document.getElementById("formAffiliateUrl"),E=document.getElementById("formLang"),k=document.getElementById("formTitle");function a(t,o){f.innerHTML=`
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${o==="success"?'<polyline points="20 6 9 17 4 12"/>':'<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'}
        </svg>
        ${t}
      `,f.className=`status-message ${o}`}function p(){f.className="status-message"}async function x(){const t=g.value.trim();if(!t){a("Por favor ingresa una URL de Amazon o un ASIN","error");return}p(),l.disabled=!0,l.innerHTML=`
        <svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Extrayendo...
      `;try{const o=/^[A-Z0-9]{10}$/i.test(t);let e=null;try{const i=await fetch("/api/admin/fetch-product-data",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify(o?{asin:t}:{url:t})});if(i.ok){const d=await i.json();d.success&&(e=d.data)}}catch{console.log("PA-API not available, using basic parsing")}if(e){v.textContent=e.asin,y.textContent="amazon.com",h.textContent=e.affiliateUrl,e.title&&(I.textContent=e.title,m.style.display="block",k.value=e.title),w.value=e.asin,B.value=e.affiliateUrl,E.value="en";const i=document.getElementById("formBrand"),d=document.getElementById("formPrice"),b=document.getElementById("formOriginalPrice"),T=document.getElementById("formShortDesc"),A=document.getElementById("formImage");e.brand&&(i.value=e.brand),e.price&&(d.value=e.price.toString()),e.originalPrice&&(b.value=e.originalPrice.toString()),e.shortDescription&&(T.value=e.shortDescription),e.featuredImageUrl&&(A.value=e.featuredImageUrl),c.classList.add("visible"),a("Datos completos extraidos via PA-API","success"),c.scrollIntoView({behavior:"smooth",block:"start"});return}const r=await fetch("/api/admin/parse-amazon-url",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify(o?{asin:t}:{url:t})}),s=await r.json();if(!r.ok){a(s.error||"Error al procesar la URL","error");return}const n=s.data;v.textContent=n.asin,y.textContent=`amazon.${n.marketplace}`,h.textContent=n.affiliateUrl,n.suggestedTitle?(I.textContent=n.suggestedTitle,m.style.display="block",k.value=n.suggestedTitle):m.style.display="none",w.value=n.asin,B.value=n.affiliateUrl,E.value=n.lang,c.classList.add("visible"),a("Datos basicos extraidos (configura PA-API para datos completos)","success"),c.scrollIntoView({behavior:"smooth",block:"start"})}catch(o){a("Error de conexion. Intenta de nuevo.","error"),console.error(o)}finally{l.disabled=!1,l.innerHTML=`
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          Extraer
        `}}l.addEventListener("click",x);g.addEventListener("keypress",t=>{t.key==="Enter"&&(t.preventDefault(),x())});u.addEventListener("submit",async t=>{t.preventDefault(),p();const o=u.querySelector('button[type="submit"]');o.disabled=!0,o.innerHTML=`
        <svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
        Creando...
      `;const e=new FormData(u),r={};e.forEach((s,n)=>{r[n]=s}),r.featuredImage&&(r.featuredImageUrl=r.featuredImage,r.featuredImageAlt=r.title,delete r.featuredImage);try{const s=await fetch("/api/admin/products",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify(r)}),n=await s.json();if(!s.ok){a(n.error||"Error al crear el producto","error");return}a(`Producto "${r.title}" creado exitosamente!`,"success"),setTimeout(()=>{window.location.href="/admin/products"},1500)}catch(s){a("Error de conexion. Intenta de nuevo.","error"),console.error(s)}finally{o.disabled=!1,o.innerHTML=`
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Crear Producto
        `}});C.addEventListener("click",()=>{g.value="",u.reset(),c.classList.remove("visible"),p(),window.scrollTo({top:0,behavior:"smooth"})});
