import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AlojamientoService,
  CamaInputDto,
  Comodidad,
  CreateComodidadDto,
  CreateHabitacionDto,
  CreatePisoZonaDto,
  Habitacion,
  InventarioInputDto,
  PisoZona,
  UpdateComodidadDto,
  UpdateHabitacionDto,
  UpdatePisoZonaDto,
} from '../../../../core/services/alojamiento.service';

type ToolMode = 'select' | 'draw';
type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

@Component({
  selector: 'app-alojamiento-mapa-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alojamiento-mapa.page.html',
})
export class AlojamientoMapaPage {
  private alojamientoService = inject(AlojamientoService);

  @ViewChild('svgRef', { static: false }) svgRef?: ElementRef<SVGSVGElement>;

  pisos: PisoZona[] = [];
  selectedPiso: PisoZona | null = null;
  habitaciones: Habitacion[] = [];
  comodidades: Comodidad[] = [];

  loading = false;
  errorMsg = '';
  private errorTimeoutId: ReturnType<typeof setTimeout> | null = null;

  tool: ToolMode = 'select';
  mapEditMode = false;
  roomEditMode = false;
  showGrid = true;
  handleSize = 8;

  viewBoxX = 0;
  viewBoxY = 0;
  viewBoxW = 1400;
  viewBoxH = 900;

  isDrawing = false;
  drawStart: { x: number; y: number } | null = null;
  drawCurrent: { x: number; y: number } | null = null;
  drawRect: { x: number; y: number; w: number; h: number } | null = null;

  isPanning = false;
  panStart: { x: number; y: number; vx: number; vy: number } | null = null;

  selectedRoomIds = new Set<string>();
  selectedRoom: Habitacion | null = null;
  isRoomPanelOpen = false;
  hoveredRoomId: string | null = null;
  enterMapEditAfterPisoSave = false;
  copiedRoomRect: { x: number; y: number; w: number; h: number } | null = null;

  isDraggingRoom = false;
  dragState: {
    roomId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null = null;

  isResizingRoom = false;
  resizeState: {
    roomId: string;
    handle: ResizeHandle;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null = null;

  // Modals
  isFloorModalOpen = false;
  isCatalogModalOpen = false;

  floorForm: CreatePisoZonaDto & { id?: string } = {
    nombre: '',
    orden: 1,
    anchoLienzo: 1400,
    altoLienzo: 900,
    tamanoCuadricula: 5,
    snapActivo: true,
  };

  roomForm: (CreateHabitacionDto & { id?: string }) = {
    identificador: '',
    precio: 0,
    estadoActivo: true,
    posX: 0,
    posY: 0,
    ancho: 0,
    alto: 0,
    comodidades: [],
    camas: [],
    inventario: [],
  };

  newAmenity: CreateComodidadDto = { nombre: '', descripcion: '', activa: true };
  editAmenity: (UpdateComodidadDto & { id?: string }) | null = null;


  ngOnInit() {
    this.loadCatalogos();
    this.loadPisos();
  }

  // ---------- Carga inicial ----------
  loadCatalogos() {
    this.alojamientoService.listComodidades(true).subscribe({
      next: (data) => (this.comodidades = data ?? []),
      error: () => {},
    });
  }

  loadPisos() {
    this.loading = true;
    this.alojamientoService.listPisos().subscribe({
      next: (data) => {
        this.pisos = data ?? [];
        if (this.pisos.length > 0) {
          this.selectPiso(this.pisos[0]);
        } else {
          this.selectedPiso = null;
          this.habitaciones = [];
          this.mapEditMode = false;
          this.roomEditMode = false;
          this.isRoomPanelOpen = false;
        }
      },
      error: (err) => this.setError(this.mapError(err)),
      complete: () => (this.loading = false),
    });
  }

  onPisoSelect(id: string | null) {
    if (!id) return;
    const piso = this.pisos.find((p) => p.id === id);
    if (piso) this.selectPiso(piso);
  }

  selectPiso(piso: PisoZona) {
    this.selectedPiso = piso;
    this.selectedRoomIds.clear();
    this.selectedRoom = null;
    this.isRoomPanelOpen = false;
    this.resetViewBox(piso);
    this.loadHabitaciones(piso.id);
  }

  resetViewBox(piso: PisoZona) {
    this.viewBoxX = 0;
    this.viewBoxY = 0;
    this.viewBoxW = piso.anchoLienzo;
    this.viewBoxH = piso.altoLienzo;
  }

  loadHabitaciones(pisoId: string) {
    this.alojamientoService.listHabitaciones(pisoId).subscribe({
      next: (data) => {
        this.habitaciones = data ?? [];
        if (this.selectedRoom) {
          const refreshed = this.habitaciones.find((r) => r.id === this.selectedRoom!.id) || null;
          this.selectedRoom = refreshed;
          if (!refreshed) {
            this.selectedRoomIds.clear();
            this.isRoomPanelOpen = false;
          }
        }
      },
      error: (err) => this.setError(this.mapError(err)),
    });
  }

  // ---------- Piso/Zona CRUD ----------
  openCreatePiso() {
    this.floorForm = {
      nombre: '',
      orden: (this.pisos.length || 0) + 1,
      anchoLienzo: 1400,
      altoLienzo: 900,
      tamanoCuadricula: 5,
      snapActivo: true,
    };
    this.isFloorModalOpen = true;
  }

  private setError(message: string) {
    this.errorMsg = message;
    if (this.errorTimeoutId) {
      clearTimeout(this.errorTimeoutId);
    }
    this.errorTimeoutId = setTimeout(() => {
      this.errorMsg = '';
      this.errorTimeoutId = null;
    }, 5000);
  }

  clearError() {
    if (this.errorTimeoutId) {
      clearTimeout(this.errorTimeoutId);
      this.errorTimeoutId = null;
    }
    this.errorMsg = '';
  }

  openEditPiso(piso: PisoZona) {
    this.floorForm = {
      id: piso.id,
      nombre: piso.nombre,
      orden: piso.orden,
      anchoLienzo: piso.anchoLienzo,
      altoLienzo: piso.altoLienzo,
      tamanoCuadricula: piso.tamanoCuadricula,
      snapActivo: piso.snapActivo,
    };
    this.isFloorModalOpen = true;
  }

  closeFloorModal() {
    this.isFloorModalOpen = false;
    this.enterMapEditAfterPisoSave = false;
  }

  savePiso() {
    const payload: CreatePisoZonaDto = {
      nombre: (this.floorForm.nombre ?? '').trim(),
      orden: Number(this.floorForm.orden ?? 1),
      anchoLienzo: Number(this.floorForm.anchoLienzo ?? 1400),
      altoLienzo: Number(this.floorForm.altoLienzo ?? 900),
      tamanoCuadricula: Number(this.floorForm.tamanoCuadricula ?? 20),
      snapActivo: !!this.floorForm.snapActivo,
    };

    if (this.floorForm.id) {
      const dto: UpdatePisoZonaDto = payload;
      this.alojamientoService.updatePiso(this.floorForm.id, dto).subscribe({
        next: (p) => {
          const idx = this.pisos.findIndex((x) => x.id === p.id);
          if (idx >= 0) this.pisos[idx] = p;
          if (this.selectedPiso?.id === p.id) this.selectPiso(p);
          this.closeFloorModal();
        },
        error: (err) => this.setError(this.mapError(err)),
      });
    } else {
      this.alojamientoService.createPiso(payload).subscribe({
        next: (p) => {
          this.pisos = [...this.pisos, p].sort((a, b) => a.orden - b.orden);
          this.selectPiso(p);
          if (this.enterMapEditAfterPisoSave) {
            this.mapEditMode = true;
            this.enterMapEditAfterPisoSave = false;
          }
          this.closeFloorModal();
        },
        error: (err) => this.setError(this.mapError(err)),
      });
    }
  }

  removePiso(piso: PisoZona) {
    const ok = confirm(`¿Eliminar "${piso.nombre}"? Esto borrará sus habitaciones.`);
    if (!ok) return;

    this.alojamientoService.removePiso(piso.id).subscribe({
      next: () => {
        this.pisos = this.pisos.filter((p) => p.id !== piso.id);
        if (this.selectedPiso?.id === piso.id) {
          this.selectedPiso = this.pisos[0] ?? null;
          if (this.selectedPiso) this.selectPiso(this.selectedPiso);
          else {
            this.habitaciones = [];
            this.mapEditMode = false;
            this.roomEditMode = false;
            this.isRoomPanelOpen = false;
          }
        }
        this.closeFloorModal();
      },
      error: (err) => this.setError(this.mapError(err)),
    });
  }

  removePisoById(id: string) {
    const piso = this.pisos.find((p) => p.id === id);
    if (piso) this.removePiso(piso);
  }

  toggleSnap() {
    if (!this.selectedPiso) return;
    const next = !this.selectedPiso.snapActivo;
    this.alojamientoService.updatePiso(this.selectedPiso.id, { snapActivo: next }).subscribe({
      next: (p) => {
        this.selectedPiso = p;
        const idx = this.pisos.findIndex((x) => x.id === p.id);
        if (idx >= 0) this.pisos[idx] = p;
      },
      error: (err) => this.setError(this.mapError(err)),
    });
  }

  updateGridSize(value: number) {
    if (!this.selectedPiso) return;
    const tamano = Math.max(5, Math.round(value));
    this.alojamientoService.updatePiso(this.selectedPiso.id, { tamanoCuadricula: tamano }).subscribe({
      next: (p) => {
        this.selectedPiso = p;
        const idx = this.pisos.findIndex((x) => x.id === p.id);
        if (idx >= 0) this.pisos[idx] = p;
      },
      error: (err) => this.setError(this.mapError(err)),
    });
  }

  startCreatePiso() {
    this.enterMapEditAfterPisoSave = true;
    this.openCreatePiso();
  }

  enterMapEdit() {
    if (!this.selectedPiso) {
      this.startCreatePiso();
      return;
    }
    this.mapEditMode = true;
    this.roomEditMode = false;
    this.isRoomPanelOpen = false;
    this.tool = 'select';
    this.resetCanvasState();
  }

  exitMapEdit() {
    this.mapEditMode = false;
    this.roomEditMode = false;
    this.tool = 'select';
    this.resetCanvasState();
    if (this.selectedRoom) {
      this.isRoomPanelOpen = true;
    }
  }

  startRoomEdit() {
    if (!this.selectedRoom) return;
    this.roomEditMode = true;
    this.openEditRoom(this.selectedRoom);
  }

  cancelRoomEdit() {
    this.roomEditMode = false;
  }

  private resetCanvasState() {
    this.isDrawing = false;
    this.drawStart = null;
    this.drawCurrent = null;
    this.drawRect = null;
    this.isDraggingRoom = false;
    this.isResizingRoom = false;
    this.dragState = null;
    this.resizeState = null;
  }

  // ---------- Canvas helpers ----------
  get viewBox() {
    return `${this.viewBoxX} ${this.viewBoxY} ${this.viewBoxW} ${this.viewBoxH}`;
  }

  get gridSize() {
    return this.selectedPiso?.tamanoCuadricula ?? 20;
  }

  get snapActivo() {
    return this.selectedPiso?.snapActivo ?? true;
  }

  private getSvgPoint(evt: MouseEvent) {
    const svg = this.svgRef?.nativeElement;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = evt.clientX;
    point.y = evt.clientY;
    const local = point.matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y };
  }

  private snap(value: number) {
    if (!this.snapActivo) return value;
    const g = this.gridSize;
    return Math.round(value / g) * g;
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (!this.mapEditMode) return;
    const key = event.key.toLowerCase();
    const hasModifier = event.ctrlKey || event.metaKey;
    if (!hasModifier) return;

    if (key === 'c') {
      if (this.selectedRoomIds.size !== 1) return;
      const id = Array.from(this.selectedRoomIds)[0];
      const room = this.getRoomById(id);
      if (!room) return;
      this.copiedRoomRect = { x: room.posX, y: room.posY, w: room.ancho, h: room.alto };
      event.preventDefault();
      return;
    }

    if (key === 'v') {
      const piso = this.selectedPiso;
      if (!this.copiedRoomRect || !piso) return;
      const offset = this.gridSize;
      const rect = this.clampRoomRect(
        {
          x: this.copiedRoomRect.x + offset,
          y: this.copiedRoomRect.y + offset,
          w: this.copiedRoomRect.w,
          h: this.copiedRoomRect.h,
        },
        piso.anchoLienzo,
        piso.altoLienzo,
      );
      event.preventDefault();
      this.createRoomFromRect(rect);
    }
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 1.1 : 0.9;
    const nextW = Math.min(Math.max(this.viewBoxW * factor, 200), 5000);
    const nextH = Math.min(Math.max(this.viewBoxH * factor, 200), 5000);
    const svg = this.svgRef?.nativeElement;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = ((event.clientX - rect.left) / rect.width) * this.viewBoxW + this.viewBoxX;
    const my = ((event.clientY - rect.top) / rect.height) * this.viewBoxH + this.viewBoxY;
    const dx = (mx - this.viewBoxX) / this.viewBoxW;
    const dy = (my - this.viewBoxY) / this.viewBoxH;
    this.viewBoxW = nextW;
    this.viewBoxH = nextH;
    this.viewBoxX = mx - dx * nextW;
    this.viewBoxY = my - dy * nextH;
  }

  onSvgMouseDown(event: MouseEvent) {
    if (!this.selectedPiso) return;
    if (event.button === 2) {
      event.preventDefault();
      this.isPanning = true;
      this.panStart = { x: event.clientX, y: event.clientY, vx: this.viewBoxX, vy: this.viewBoxY };
      return;
    }
    if (!this.mapEditMode) {
      const target = event.target as HTMLElement;
      if (!target?.getAttribute('data-room-id')) {
        this.selectedRoomIds.clear();
        this.selectedRoom = null;
        this.isRoomPanelOpen = false;
        this.roomEditMode = false;
      }
      return;
    }
    if (this.tool !== 'draw') {
      this.selectedRoomIds.clear();
      this.selectedRoom = null;
      this.isRoomPanelOpen = false;
      return;
    }
    const target = event.target as HTMLElement;
    if (target?.getAttribute('data-room-id')) return;

    const p = this.getSvgPoint(event);
    this.isDrawing = true;
    this.drawStart = { x: p.x, y: p.y };
    this.drawCurrent = { x: p.x, y: p.y };
    this.drawRect = { x: p.x, y: p.y, w: 0, h: 0 };
  }

  // ---------- Habitaciones ----------
  openCreateRoomFromRect(rect: { x: number; y: number; w: number; h: number }) {
    this.roomForm = {
      identificador: '',
      precio: 0,
      estadoActivo: true,
      posX: Math.round(rect.x),
      posY: Math.round(rect.y),
      ancho: Math.round(rect.w),
      alto: Math.round(rect.h),
      comodidades: [],
      camas: [],
      inventario: [],
    };
    this.selectedRoom = null;
    this.isRoomPanelOpen = true;
  }

  private buildDefaultRoomName() {
    const base = 'Habitación';
    const used = new Set<number>();
    (this.habitaciones ?? []).forEach((room) => {
      const match = (room.identificador ?? '').match(/^Habitación\s+(\d+)$/i);
      if (match) used.add(Number(match[1]));
    });
    let next = 1;
    while (used.has(next)) next += 1;
    return `${base} ${next}`;
  }

  private createRoomFromRect(rect: { x: number; y: number; w: number; h: number }) {
    this.createRoomFromRectInternal(rect, true);
  }

  private createRoomFromRectInternal(
    rect: { x: number; y: number; w: number; h: number },
    allowOverlap = false,
  ) {
    if (!this.selectedPiso) return;
    const payload: CreateHabitacionDto = {
      identificador: this.buildDefaultRoomName(),
      precio: 0,
      estadoActivo: true,
      posX: Math.round(rect.x),
      posY: Math.round(rect.y),
      ancho: Math.round(rect.w),
      alto: Math.round(rect.h),
      comodidades: [],
      camas: [],
      inventario: [],
      allowOverlap,
    };

    this.alojamientoService.createHabitacion(this.selectedPiso.id, payload).subscribe({
      next: (room) => {
        this.selectedRoom = room;
        this.selectedRoomIds.clear();
        this.selectedRoomIds.add(room.id);
        this.drawRect = null;
        this.loadHabitaciones(this.selectedPiso!.id);
      },
      error: (err) => this.setError(this.mapError(err)),
    });
  }

  openEditRoom(room: Habitacion) {
    this.drawRect = null;
    this.roomForm = {
      id: room.id,
      identificador: room.identificador,
      precio: Number(room.precio ?? 0),
      estadoActivo: room.estadoActivo,
      posX: room.posX,
      posY: room.posY,
      ancho: room.ancho,
      alto: room.alto,
      comodidades: (room.comodidades ?? []).map((c) => c.id),
      camas: (room.camas ?? []).map((c) => ({
        item: c.item ?? '',
        cantidad: c.cantidad ?? 1,
      })),
      inventario: (room.inventarios ?? []).map((i) => ({
        item: i.item,
        cantidad: i.cantidad,
        observacion: i.observacion ?? '',
      })),
    };
    this.isRoomPanelOpen = true;
  }

  closeRoomPanel() {
    if (!this.roomForm.id) {
      this.drawRect = null;
    }
    this.roomEditMode = false;
    this.selectedRoom = null;
    this.selectedRoomIds.clear();
    this.isRoomPanelOpen = false;
  }

  saveRoom() {
    if (!this.selectedPiso) return;

    const rawBeds = (this.roomForm.camas ?? [])
      .map((b) => ({
        item: (b.item ?? '').trim(),
        cantidad: Number(b.cantidad ?? 0),
      }))
      .filter((b) => b.item && b.cantidad >= 1);

    const bedMap = new Map<string, { item: string; cantidad: number }>();
    rawBeds.forEach((b) => {
      const key = b.item.toLowerCase();
      const current = bedMap.get(key);
      if (current) {
        current.cantidad += b.cantidad;
      } else {
        bedMap.set(key, { item: b.item, cantidad: b.cantidad });
      }
    });
    const consolidatedBeds = Array.from(bedMap.values());

    const payload: CreateHabitacionDto = {
      identificador: (this.roomForm.identificador ?? '').trim(),
      precio: Number(this.roomForm.precio ?? 0),
      estadoActivo: !!this.roomForm.estadoActivo,
      posX: Number(this.roomForm.posX ?? 0),
      posY: Number(this.roomForm.posY ?? 0),
      ancho: Number(this.roomForm.ancho ?? 0),
      alto: Number(this.roomForm.alto ?? 0),
      comodidades: this.roomForm.comodidades ?? [],
      camas: consolidatedBeds,
      inventario: (this.roomForm.inventario ?? []).filter((i) => i.item?.trim()),
    };

    if (this.roomForm.id) {
      const dto: UpdateHabitacionDto = payload;
      this.alojamientoService.updateHabitacion(this.roomForm.id, dto).subscribe({
        next: () => {
          this.loadHabitaciones(this.selectedPiso!.id);
          this.isRoomPanelOpen = true;
          if (!this.mapEditMode) {
            this.roomEditMode = false;
          }
        },
        error: (err) => this.setError(this.mapError(err)),
      });
    } else {
      this.alojamientoService.createHabitacion(this.selectedPiso.id, payload).subscribe({
        next: (room) => {
          this.selectedRoom = room;
          this.selectedRoomIds.clear();
          this.selectedRoomIds.add(room.id);
          this.openEditRoom(room);
          this.drawRect = null;
          this.loadHabitaciones(this.selectedPiso!.id);
        },
        error: (err) => this.setError(this.mapError(err)),
      });
    }
  }

  onRoomClick(event: MouseEvent, room: Habitacion) {
    event.stopPropagation();
    if (!this.mapEditMode) {
      this.selectedRoomIds.clear();
      this.selectedRoomIds.add(room.id);
      this.selectedRoom = room;
      this.isRoomPanelOpen = true;
      this.roomEditMode = false;
      return;
    }
    const multi = event.ctrlKey || event.metaKey || event.shiftKey;
    if (multi) {
      if (this.selectedRoomIds.has(room.id)) this.selectedRoomIds.delete(room.id);
      else this.selectedRoomIds.add(room.id);
      return;
    }
    this.selectedRoomIds.clear();
    this.selectedRoomIds.add(room.id);
    this.selectedRoom = room;
    return;
  }

  removeSelectedRooms() {
    if (this.selectedRoomIds.size === 0) return;
    const ok = confirm(`¿Eliminar ${this.selectedRoomIds.size} habitaciones seleccionadas?`);
    if (!ok) return;
    const ids = Array.from(this.selectedRoomIds);
    this.alojamientoService.bulkRemoveHabitaciones(ids).subscribe({
      next: () => {
        this.selectedRoomIds.clear();
        this.selectedRoom = null;
        this.isRoomPanelOpen = false;
        if (this.selectedPiso) this.loadHabitaciones(this.selectedPiso.id);
      },
      error: (err) => this.setError(this.mapError(err)),
    });
  }

  removeRoom(room: Habitacion) {
    const ok = confirm(`¿Eliminar habitación ${room.identificador}?`);
    if (!ok) return;
    this.alojamientoService.removeHabitacion(room.id).subscribe({
      next: () => {
        if (this.selectedPiso) this.loadHabitaciones(this.selectedPiso.id);
        if (this.roomForm.id === room.id) this.closeRoomPanel();
        this.selectedRoomIds.delete(room.id);
      },
      error: (err) => this.setError(this.mapError(err)),
    });
  }

  getBedTypeSummary(room: Habitacion | null) {
    const list = room?.camas ?? [];
    const counter = new Map<string, number>();
    list.forEach((bed) => {
      const name = bed.item?.trim() || 'Sin tipo';
      counter.set(name, (counter.get(name) ?? 0) + (bed.cantidad ?? 0));
    });
    return Array.from(counter.entries()).map(([name, count]) => ({ name, count }));
  }

  getBedTotal(room: Habitacion | null) {
    return (room?.camas ?? []).reduce((total, bed) => total + (bed.cantidad ?? 0), 0);
  }

  // ---------- Camas / Inventario en ficha ----------
  addCama() {
    const item: CamaInputDto = { item: '', cantidad: 1 };
    this.roomForm.camas = [...(this.roomForm.camas ?? []), item];
  }

  removeCama(index: number) {
    const list = [...(this.roomForm.camas ?? [])];
    list.splice(index, 1);
    this.roomForm.camas = list;
  }

  addInventario() {
    const item: InventarioInputDto = { item: '', cantidad: 1, observacion: '' };
    this.roomForm.inventario = [...(this.roomForm.inventario ?? []), item];
  }

  removeInventario(index: number) {
    const list = [...(this.roomForm.inventario ?? [])];
    list.splice(index, 1);
    this.roomForm.inventario = list;
  }

  // ---------- Comodidades ----------
  openCatalog() {
    this.isCatalogModalOpen = true;
  }

  closeCatalog() {
    this.isCatalogModalOpen = false;
    this.editAmenity = null;
  }

  createAmenity() {
    const payload: CreateComodidadDto = {
      nombre: (this.newAmenity.nombre ?? '').trim(),
      descripcion: this.newAmenity.descripcion?.trim() || undefined,
      activa: this.newAmenity.activa ?? true,
    };
    if (!payload.nombre) return;
    this.alojamientoService.createComodidad(payload).subscribe({
      next: (c) => {
        this.comodidades = [...this.comodidades, c].sort((a, b) => a.nombre.localeCompare(b.nombre));
        this.newAmenity = { nombre: '', descripcion: '', activa: true };
      },
      error: (err) => this.setError(this.mapError(err)),
    });
  }

  editAmenityRow(item: Comodidad) {
    this.editAmenity = { id: item.id, nombre: item.nombre, descripcion: item.descripcion ?? '', activa: item.activa };
  }

  saveAmenity() {
    if (!this.editAmenity?.id) return;
    const payload: UpdateComodidadDto = {
      nombre: this.editAmenity.nombre?.trim(),
      descripcion: this.editAmenity.descripcion?.trim() || undefined,
      activa: this.editAmenity.activa,
    };
    this.alojamientoService.updateComodidad(this.editAmenity.id, payload).subscribe({
      next: (c) => {
        const idx = this.comodidades.findIndex((x) => x.id === c.id);
        if (idx >= 0) this.comodidades[idx] = c;
        this.editAmenity = null;
      },
      error: (err) => this.setError(this.mapError(err)),
    });
  }

  removeAmenity(item: Comodidad) {
    const ok = confirm(`¿Eliminar comodidad "${item.nombre}"?`);
    if (!ok) return;
    this.alojamientoService.removeComodidad(item.id).subscribe({
      next: () => (this.comodidades = this.comodidades.filter((c) => c.id !== item.id)),
      error: (err) => this.setError(this.mapError(err)),
    });
  }


  // ---------- Helpers ----------
  private clampRoomRect(
    rect: { x: number; y: number; w: number; h: number },
    maxW: number,
    maxH: number,
  ) {
    const minSize = 10;
    let w = Math.max(minSize, rect.w);
    let h = Math.max(minSize, rect.h);
    let x = rect.x;
    let y = rect.y;

    if (x < 0) x = 0;
    if (y < 0) y = 0;
    if (x + w > maxW) x = Math.max(0, maxW - w);
    if (y + h > maxH) y = Math.max(0, maxH - h);

    return { x, y, w, h };
  }

  onRoomMouseDown(event: MouseEvent, room: Habitacion) {
    if (!this.mapEditMode) return;
    if (this.tool !== 'select') return;
    if (event.button !== 0) return;
    event.stopPropagation();
    this.isDraggingRoom = true;
    const p = this.getSvgPoint(event);
    this.dragState = {
      roomId: room.id,
      startX: p.x,
      startY: p.y,
      origX: room.posX,
      origY: room.posY,
    };
  }

  onResizeMouseDown(event: MouseEvent, room: Habitacion, handle: ResizeHandle) {
    if (!this.mapEditMode) return;
    if (this.tool !== 'select') return;
    if (event.button !== 0) return;
    event.stopPropagation();
    this.isResizingRoom = true;
    const p = this.getSvgPoint(event);
    this.resizeState = {
      roomId: room.id,
      handle,
      startX: p.x,
      startY: p.y,
      origX: room.posX,
      origY: room.posY,
      origW: room.ancho,
      origH: room.alto,
    };
  }

  onSvgMouseMove(event: MouseEvent) {
    if (this.isDraggingRoom && this.dragState && this.selectedPiso) {
      const p = this.getSvgPoint(event);
      const dx = p.x - this.dragState.startX;
      const dy = p.y - this.dragState.startY;
      const rawX = this.dragState.origX + dx;
      const rawY = this.dragState.origY + dy;
      const x = this.snap(rawX);
      const y = this.snap(rawY);
      const rect = this.clampRoomRect(
        { x, y, w: this.getRoomById(this.dragState.roomId)?.ancho ?? 10, h: this.getRoomById(this.dragState.roomId)?.alto ?? 10 },
        this.selectedPiso.anchoLienzo,
        this.selectedPiso.altoLienzo,
      );
      const room = this.getRoomById(this.dragState.roomId);
      if (room) {
        room.posX = rect.x;
        room.posY = rect.y;
      }
      return;
    }

    if (this.isResizingRoom && this.resizeState && this.selectedPiso) {
      const p = this.getSvgPoint(event);
      const dx = p.x - this.resizeState.startX;
      const dy = p.y - this.resizeState.startY;
      let x = this.resizeState.origX;
      let y = this.resizeState.origY;
      let w = this.resizeState.origW;
      let h = this.resizeState.origH;

      const handle = this.resizeState.handle;
      if (handle.includes('e')) w = this.resizeState.origW + dx;
      if (handle.includes('s')) h = this.resizeState.origH + dy;
      if (handle.includes('w')) {
        w = this.resizeState.origW - dx;
        x = this.resizeState.origX + dx;
      }
      if (handle.includes('n')) {
        h = this.resizeState.origH - dy;
        y = this.resizeState.origY + dy;
      }

      w = this.snap(w);
      h = this.snap(h);
      x = this.snap(x);
      y = this.snap(y);

      const rect = this.clampRoomRect(
        { x, y, w, h },
        this.selectedPiso.anchoLienzo,
        this.selectedPiso.altoLienzo,
      );
      const room = this.getRoomById(this.resizeState.roomId);
      if (room) {
        room.posX = rect.x;
        room.posY = rect.y;
        room.ancho = rect.w;
        room.alto = rect.h;
      }
      return;
    }

    if (this.isPanning && this.panStart) {
      const dx = event.clientX - this.panStart.x;
      const dy = event.clientY - this.panStart.y;
      const svg = this.svgRef?.nativeElement;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const scaleX = this.viewBoxW / rect.width;
      const scaleY = this.viewBoxH / rect.height;
      this.viewBoxX = this.panStart.vx - dx * scaleX;
      this.viewBoxY = this.panStart.vy - dy * scaleY;
      return;
    }

    if (!this.isDrawing || !this.drawStart) return;
    const p = this.getSvgPoint(event);
    this.drawCurrent = { x: p.x, y: p.y };
    const w = p.x - this.drawStart.x;
    const h = p.y - this.drawStart.y;
    this.drawRect = {
      x: w < 0 ? p.x : this.drawStart.x,
      y: h < 0 ? p.y : this.drawStart.y,
      w: Math.abs(w),
      h: Math.abs(h),
    };
  }

  onSvgMouseUp() {
    if (this.isDraggingRoom && this.dragState && this.selectedPiso) {
      const room = this.getRoomById(this.dragState.roomId);
      const original = { x: this.dragState.origX, y: this.dragState.origY };
      this.isDraggingRoom = false;
      this.dragState = null;
      if (!room) return;
      this.alojamientoService.updateHabitacion(room.id, { posX: room.posX, posY: room.posY }).subscribe({
        next: () => this.loadHabitaciones(this.selectedPiso!.id),
        error: (err) => {
          room.posX = original.x;
          room.posY = original.y;
          this.setError(this.mapError(err));
        },
      });
      return;
    }

    if (this.isResizingRoom && this.resizeState && this.selectedPiso) {
      const room = this.getRoomById(this.resizeState.roomId);
      const original = {
        x: this.resizeState.origX,
        y: this.resizeState.origY,
        w: this.resizeState.origW,
        h: this.resizeState.origH,
      };
      this.isResizingRoom = false;
      this.resizeState = null;
      if (!room) return;
      this.alojamientoService.updateHabitacion(room.id, {
        posX: room.posX,
        posY: room.posY,
        ancho: room.ancho,
        alto: room.alto,
      }).subscribe({
        next: () => this.loadHabitaciones(this.selectedPiso!.id),
        error: (err) => {
          room.posX = original.x;
          room.posY = original.y;
          room.ancho = original.w;
          room.alto = original.h;
          this.setError(this.mapError(err));
        },
      });
      return;
    }

    if (this.isPanning) {
      this.isPanning = false;
      this.panStart = null;
      return;
    }

    if (!this.isDrawing || !this.drawRect || !this.selectedPiso || !this.drawStart || !this.drawCurrent) {
      this.isDrawing = false;
      this.drawStart = null;
      this.drawCurrent = null;
      this.drawRect = null;
      return;
    }

    const startX = this.snap(this.drawStart.x);
    const startY = this.snap(this.drawStart.y);
    const endX = this.snap(this.drawCurrent.x);
    const endY = this.snap(this.drawCurrent.y);
    const rect = {
      x: Math.min(startX, endX),
      y: Math.min(startY, endY),
      w: Math.abs(endX - startX),
      h: Math.abs(endY - startY),
    };

    if (rect.w < 10 || rect.h < 10) {
      this.isDrawing = false;
      this.drawStart = null;
      this.drawCurrent = null;
      this.drawRect = null;
      return;
    }

    this.drawRect = rect;
    if (this.mapEditMode) {
      this.createRoomFromRect(rect);
    }
    this.isDrawing = false;
    this.drawStart = null;
    this.drawCurrent = null;
  }

  onSvgMouseLeave() {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.drawStart = null;
      this.drawCurrent = null;
      this.drawRect = null;
    }
    if (this.isPanning) {
      this.isPanning = false;
      this.panStart = null;
    }
    if (this.isDraggingRoom) {
      this.isDraggingRoom = false;
      this.dragState = null;
    }
    if (this.isResizingRoom) {
      this.isResizingRoom = false;
      this.resizeState = null;
    }
  }

  private getRoomById(id: string) {
    return this.habitaciones.find((r) => r.id === id) || null;
  }

  isAmenitySelected(id: string) {
    return (this.roomForm.comodidades ?? []).includes(id);
  }

  toggleAmenity(id: string, checked: boolean) {
    const set = new Set(this.roomForm.comodidades ?? []);
    if (checked) set.add(id);
    else set.delete(id);
    this.roomForm.comodidades = Array.from(set);
  }

  isSelected(roomId: string) {
    return this.selectedRoomIds.has(roomId);
  }

  trackById(_index: number, item: { id: string }) {
    return item.id;
  }

  private mapError(err: any): string {
    const status = err?.status;
    const msg = err?.error?.message;
    if (status === 409) return Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'Conflicto');
    if (status === 400) return Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'Datos inválidos');
    if (status === 401) return 'Sesión expirada. Inicia sesión nuevamente.';
    if (status === 403) return 'No autorizado.';
    return Array.isArray(msg) ? msg.join(' | ') : (msg ?? 'Error inesperado');
  }
}
