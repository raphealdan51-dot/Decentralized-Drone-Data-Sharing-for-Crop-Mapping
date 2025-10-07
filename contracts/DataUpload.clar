(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-DATA-HASH u101)
(define-constant ERR-INVALID-METADATA u102)
(define-constant ERR-INVALID-LOCATION u103)
(define-constant ERR-INVALID-CROP-TYPE u104)
(define-constant ERR-INVALID-CAPTURE-DATE u105)
(define-constant ERR-INVALID-PRICE u106)
(define-constant ERR-DATA-ALREADY-EXISTS u107)
(define-constant ERR-DATA-NOT-FOUND u108)
(define-constant ERR-INVALID-TIMESTAMP u109)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u110)
(define-constant ERR-INVALID-DATA-TYPE u111)
(define-constant ERR-INVALID-RESOLUTION u112)
(define-constant ERR-GROUP-UPDATE-NOT-ALLOWED u113)
(define-constant ERR-INVALID-UPDATE-PARAM u114)
(define-constant ERR-MAX-DATA-ENTRIES-EXCEEDED u115)
(define-constant ERR-INVALID-DATA-FORMAT u116)
(define-constant ERR-INVALID-COORDINATES u117)
(define-constant ERR-INVALID-SENSOR-TYPE u118)
(define-constant ERR-INVALID-OWNER u119)
(define-constant ERR-INVALID-STATUS u120)

(define-data-var next-data-id uint u0)
(define-data-var max-data-entries uint u10000)
(define-data-var upload-fee uint u100)
(define-data-var authority-contract (optional principal) none)

(define-map data-uploads
  uint
  {
    data-hash: (string-ascii 64),
    metadata: (string-utf8 500),
    location: (string-utf8 100),
    crop-type: (string-utf8 50),
    capture-date: uint,
    price: uint,
    timestamp: uint,
    owner: principal,
    data-type: (string-utf8 50),
    resolution: uint,
    coordinates: (tuple (lat int) (lon int)),
    sensor-type: (string-utf8 50),
    format: (string-utf8 20),
    status: bool
  }
)

(define-map data-by-hash
  (string-ascii 64)
  uint)

(define-map data-updates
  uint
  {
    update-metadata: (string-utf8 500),
    update-price: uint,
    update-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-data (id uint))
  (map-get? data-uploads id)
)

(define-read-only (get-data-updates (id uint))
  (map-get? data-updates id)
)

(define-read-only (is-data-registered (hash (string-ascii 64)))
  (is-some (map-get? data-by-hash hash))
)

(define-private (validate-data-hash (hash (string-ascii 64)))
  (if (and (> (len hash) u0) (<= (len hash) u64))
      (ok true)
      (err ERR-INVALID-DATA-HASH))
)

(define-private (validate-metadata (meta (string-utf8 500)))
  (if (and (> (len meta) u0) (<= (len meta) u500))
      (ok true)
      (err ERR-INVALID-METADATA))
)

(define-private (validate-location (loc (string-utf8 100)))
  (if (and (> (len loc) u0) (<= (len loc) u100))
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-private (validate-crop-type (ctype (string-utf8 50)))
  (if (or (is-eq ctype "wheat") (is-eq ctype "corn") (is-eq ctype "rice") (is-eq ctype "soybean"))
      (ok true)
      (err ERR-INVALID-CROP-TYPE))
)

(define-private (validate-capture-date (date uint))
  (if (> date u0)
      (ok true)
      (err ERR-INVALID-CAPTURE-DATE))
)

(define-private (validate-price (p uint))
  (if (>= p u0)
      (ok true)
      (err ERR-INVALID-PRICE))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-data-type (dtype (string-utf8 50)))
  (if (or (is-eq dtype "ndvi") (is-eq dtype "aerial") (is-eq dtype "thermal"))
      (ok true)
      (err ERR-INVALID-DATA-TYPE))
)

(define-private (validate-resolution (res uint))
  (if (and (> res u0) (<= res u10000))
      (ok true)
      (err ERR-INVALID-RESOLUTION))
)

(define-private (validate-coordinates (coords (tuple (lat int) (lon int))))
  (if (and (>= (get lat coords) -90) (<= (get lat coords) 90) (>= (get lon coords) -180) (<= (get lon coords) 180))
      (ok true)
      (err ERR-INVALID-COORDINATES))
)

(define-private (validate-sensor-type (stype (string-utf8 50)))
  (if (or (is-eq stype "drone") (is-eq stype "satellite") (is-eq stype "ground"))
      (ok true)
      (err ERR-INVALID-SENSOR-TYPE))
)

(define-private (validate-format (fmt (string-utf8 20)))
  (if (or (is-eq fmt "geojson") (is-eq fmt "tiff") (is-eq fmt "jpeg"))
      (ok true)
      (err ERR-INVALID-DATA-FORMAT))
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-NOT-AUTHORIZED))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-data-entries (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-MAX-DATA-ENTRIES-EXCEEDED))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set max-data-entries new-max)
    (ok true)
  )
)

(define-public (set-upload-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set upload-fee new-fee)
    (ok true)
  )
)

(define-public (register-data
  (data-hash (string-ascii 64))
  (metadata (string-utf8 500))
  (location (string-utf8 100))
  (crop-type (string-utf8 50))
  (capture-date uint)
  (price uint)
  (data-type (string-utf8 50))
  (resolution uint)
  (coordinates (tuple (lat int) (lon int)))
  (sensor-type (string-utf8 50))
  (format (string-utf8 20))
)
  (let (
        (next-id (var-get next-data-id))
        (current-max (var-get max-data-entries))
        (authority (var-get authority-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-DATA-ENTRIES-EXCEEDED))
    (try! (validate-data-hash data-hash))
    (try! (validate-metadata metadata))
    (try! (validate-location location))
    (try! (validate-crop-type crop-type))
    (try! (validate-capture-date capture-date))
    (try! (validate-price price))
    (try! (validate-data-type data-type))
    (try! (validate-resolution resolution))
    (try! (validate-coordinates coordinates))
    (try! (validate-sensor-type sensor-type))
    (try! (validate-format format))
    (asserts! (is-none (map-get? data-by-hash data-hash)) (err ERR-DATA-ALREADY-EXISTS))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get upload-fee) tx-sender authority-recipient))
    )
    (map-set data-uploads next-id
      {
        data-hash: data-hash,
        metadata: metadata,
        location: location,
        crop-type: crop-type,
        capture-date: capture-date,
        price: price,
        timestamp: block-height,
        owner: tx-sender,
        data-type: data-type,
        resolution: resolution,
        coordinates: coordinates,
        sensor-type: sensor-type,
        format: format,
        status: true
      }
    )
    (map-set data-by-hash data-hash next-id)
    (var-set next-data-id (+ next-id u1))
    (print { event: "data-registered", id: next-id })
    (ok next-id)
  )
)

(define-public (update-metadata
  (data-id uint)
  (new-metadata (string-utf8 500))
  (new-price uint)
)
  (let ((data (map-get? data-uploads data-id)))
    (match data
      d
        (begin
          (asserts! (is-eq (get owner d) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-metadata new-metadata))
          (try! (validate-price new-price))
          (map-set data-uploads data-id
            {
              data-hash: (get data-hash d),
              metadata: new-metadata,
              location: (get location d),
              crop-type: (get crop-type d),
              capture-date: (get capture-date d),
              price: new-price,
              timestamp: block-height,
              owner: (get owner d),
              data-type: (get data-type d),
              resolution: (get resolution d),
              coordinates: (get coordinates d),
              sensor-type: (get sensor-type d),
              format: (get format d),
              status: (get status d)
            }
          )
          (map-set data-updates data-id
            {
              update-metadata: new-metadata,
              update-price: new-price,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "data-updated", id: data-id })
          (ok true)
        )
      (err ERR-DATA-NOT-FOUND)
    )
  )
)

(define-public (get-data-count)
  (ok (var-get next-data-id))
)

(define-public (check-data-existence (hash (string-ascii 64)))
  (ok (is-data-registered hash))
)

(define-public (get-data-by-hash (hash (string-ascii 64)))
  (match (map-get? data-by-hash hash)
    id (get-data id)
    none
  )
)