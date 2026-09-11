import { useBusinessProfile } from '../context/BusinessProfileContext'

export function KitchenHome() {
  const { profile } = useBusinessProfile()

  return (
    <section className="card">
      <h1>{profile.name} — কিচেন</h1>
      <p className="muted">
        আজকের ও আগামী দিনের প্রোডাকশন তালিকা এখানে দেখা যাবে। (প্রোডাকশন মডিউল পরবর্তী ধাপে যুক্ত হবে।)
      </p>
    </section>
  )
}
