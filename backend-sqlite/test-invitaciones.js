import fetch from 'node-fetch'

const BASE = 'http://localhost:4000/api'

async function main(){
  // login admin
  const loginRes = await fetch(`${BASE}/auth/login`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({email:'admin@j4pro.com', password:'Jose.1919'})
  })
  const login = await loginRes.json()
  if(!login.exito){
    console.log('Login falló:', login)
    return
  }
  const token = login.datos.accessToken || login.datos.access_token || login.datos.accessToken
  const auth = { Authorization: `Bearer ${token}` }

  // listar mis invitaciones
  const invRes = await fetch(`${BASE}/invitaciones/mis-invitaciones`, { headers: auth })
  const inv = await invRes.json()
  console.log('Mis invitaciones status:', invRes.status, invRes.statusText)
  console.log(JSON.stringify(inv, null, 2))

  // listar colaboradores
  const colRes = await fetch(`${BASE}/invitaciones/colaboradores`, { headers: auth })
  const col = await colRes.json()
  console.log('Colaboradores status:', colRes.status, colRes.statusText)
  console.log(JSON.stringify(col, null, 2))
}

main().catch(e=>console.error(e))
