import RadnikDashboard from '../../components/radnik/RadnikDashboard'

export default function RadnikPage({ params }) {
  // U produkciji ovdje dolazi pravi auth
  // Za sada koristimo ID Marka iz baze – provjeri u Supabase tabeli radnici
  const radnikId = '1bb1a7f6-b340-469b-8eb7-70de31bda7d8'

  return <RadnikDashboard radnikId={radnikId} />
}