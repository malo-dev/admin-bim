import { useQuery } from '@tanstack/vue-query';
import { computed } from 'vue';
import NotesService from '../services/notes.service';

export function useNotesQuery(filters) {
    return useQuery({
        queryKey: computed(() => ['notes', filters.value]),
        queryFn: () => NotesService.getNotes({ ...filters.value, paginate: 'true' }),
    });
}

export function useAllCompaniesForNotesQuery() {
    return useQuery({
        queryKey: ['companies-all'],
        queryFn: () => NotesService.getAllCompanies(),
        staleTime: 1000 * 60 * 5,
        select: (raw) => {
            const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
            return list.map((c) => ({ label: c.name, value: c.companyId }));
        },
    });
}
