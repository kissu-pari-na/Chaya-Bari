/** The fixed aurora + grain layer that sits behind every page (design.md §5). */
export function Backdrop() {
  return (
    <>
      <div className="aurora" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="grain" aria-hidden="true" />
    </>
  )
}
