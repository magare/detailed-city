# Parking Curbs

Owns parking, loading, ride-hail zones, curb restrictions, pricing, enforcement, and curb allocation.

The first executable curb seed generates `curb-zone` objects for the detailed street slice. Each curb zone attaches to a sidewalk and road, records start/end meters along the corridor, and reserves no-stopping clearance around crossings before loading, ride-hail, bus, emergency, or parking allocation is applied.
