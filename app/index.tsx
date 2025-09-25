// App Entry Point - Routes all users to landing page
import { Redirect } from 'expo-router'

export default function Index() {
  return <Redirect href="/landing" />
}