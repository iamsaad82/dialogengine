import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/default')
  return null
}

